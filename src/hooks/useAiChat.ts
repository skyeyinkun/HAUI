import { useState, useEffect, useCallback, useRef } from 'react';
import { AiConfig, DEFAULT_CONFIG, AiConfigSchema } from '@/services/ai-service';
import { chatStream, AiChatMessage, StreamEvent } from '@/services/ai-chat';
import { HassEntities, Connection } from 'home-assistant-js-websocket';
import { connectToHA } from '@/utils/ha-connection';
import { executeHaTools } from '@/services/ai-tools-executor';
import { getApiUrl } from '@/utils/sync';
import { getDeviceSummary } from '@/utils/ai-context';

// 消息类型定义
export interface Message {
    id: string;
    role: 'user' | 'ai' | 'tool';
    content: string | null;
    timestamp: number;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

// Hook 选项
export interface UseAiChatOptions {
    entities: HassEntities;
    /** 语音模式开关 */
    isVoiceMode: boolean;
    /** AI 回复完成后回调（用于 TTS 朗读等后续处理） */
    onAiReplyDone?: (content: string) => void;
    /** 状态与提示回调 */
    onStatusChange?: (status: string) => void;
    /** 错误状态回调 */
    onError?: () => void;
}

// Hook 返回值
export interface UseAiChatReturn {
    messages: Message[];
    inputValue: string;
    setInputValue: (val: string) => void;
    isLoading: boolean;
    config: AiConfig;
    sendMessage: (textOverride?: string) => Promise<void>;
    handleSaveConfig: (newConfig: AiConfig) => Promise<void>;
    clearHistory: () => void;
    abortChat: () => void;
}

// 默认欢迎消息
const WELCOME_MESSAGE: Message = {
    id: 'welcome',
    role: 'ai',
    content: '你好！我是你的 AI 智能管家。我们可以通过**文字**或顶部的**语音图标**开启"全双工对话"进行交流。我可以帮你查看设备状态、控制家中设备、提供自动化建议。请问有什么可以帮你的吗？',
    timestamp: Date.now()
};

/** 消息上下文窗口大小（约 10 轮对话） */
const MAX_CONTEXT_MESSAGES = 20;
/** 持久化保存的最大消息数 */
const MAX_PERSIST_MESSAGES = 50;
/** 多轮工具调用的最大轮次，防止死循环 */
const MAX_TOOL_ROUNDS = 3;
/** 持久化存储 key */
const CHAT_HISTORY_KEY = 'ai_chat_history';
/** 持久化节流间隔（毫秒） */
const PERSIST_THROTTLE_MS = 2000;

/**
 * AI 对话核心 Hook — 封装消息管理、配置加载/保存、消息发送逻辑
 */
export function useAiChat({
    entities,
    isVoiceMode,
    onAiReplyDone,
    onStatusChange,
    onError,
}: UseAiChatOptions): UseAiChatReturn {
    // 从 localStorage 恢复对话历史，无则使用欢迎消息
    const [messages, setMessages] = useState<Message[]>(() => {
        try {
            const saved = localStorage.getItem(CHAT_HISTORY_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch { /* 忽略解析错误 */ }
        return [{ ...WELCOME_MESSAGE, timestamp: Date.now() }];
    });
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);

    // Ref 用于避免闭包内获取过期的 entities / config
    const entitiesRef = useRef(entities);
    entitiesRef.current = entities;
    const configRef = useRef(config);
    configRef.current = config;
    const isVoiceModeRef = useRef(isVoiceMode);
    isVoiceModeRef.current = isVoiceMode;

    const abortControllerRef = useRef<AbortController | null>(null);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 节流持久化消息到 localStorage
    useEffect(() => {
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            try {
                // 只保存最近 N 条消息
                const toSave = messages.slice(-MAX_PERSIST_MESSAGES);
                localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(toSave));
            } catch { /* 写入失败时静默忽略 */ }
        }, PERSIST_THROTTLE_MS);
        return () => {
            if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        };
    }, [messages]);

    // 初始化：从 localStorage 和后端加载配置
    useEffect(() => {
        const savedConfig = localStorage.getItem('ai_config');
        if (savedConfig) {
            try {
                const raw = JSON.parse(savedConfig);
                const result = AiConfigSchema.safeParse(raw);
                if (result.success) {
                    setConfig(result.data as AiConfig);
                } else {
                    localStorage.removeItem('ai_config');
                }
            } catch {
                localStorage.removeItem('ai_config');
            }
        }

        // 尝试从后端获取最新的配置
        fetch(getApiUrl('/api/ai/config'))
            .then(res => res.json())
            .then(data => {
                if (data && data.modelName) {
                    setConfig(prev => ({ ...prev, ...data }));
                    localStorage.setItem('ai_config', JSON.stringify(data));
                }
            }).catch(() => { });
    }, []);

    // 保存 AI 配置（前端 + 后端同步）
    const handleSaveConfig = useCallback(async (newConfig: AiConfig) => {
        setConfig(newConfig);
        localStorage.setItem('ai_config', JSON.stringify(newConfig));
        try {
            await fetch(getApiUrl('/api/ai/config'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
        } catch (e) {
            console.error('保存 AI 配置到后端失败', e);
        }
    }, []);

    const abortChat = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        onStatusChange?.('');
    }, [onStatusChange]);

    // 核心发送函数
    const sendMessage = useCallback(async (textOverride?: string) => {
        const text = (textOverride ?? inputValue).trim();
        if (!text || isLoading) return;

        // 若当前有正在生成的请求则中断它
        abortChat();

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        const activeController = new AbortController();
        abortControllerRef.current = activeController;

        // 构建设备摘要注入系统提示词
        const deviceSummary = getDeviceSummary(entitiesRef.current);
        const systemPrompt = `你是一个专业的家庭自动化管家。根据用户的指令，你可以通过 call_ha_service 工具操纵家庭设备。如果需要当前设备状态，必须先通过 get_entity_state 工具查询然后再回答用户。回答要简练、亲切！语音对话时尽量缩减篇幅。当无法查到设备或者调用报错时如实告知用户。\n\n${deviceSummary}`;

        // 使用滑动窗口截取最近的消息，避免 token 超限
        const recentMessages = newMessages.slice(1).slice(-MAX_CONTEXT_MESSAGES);
        const baseChatMessages: AiChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...recentMessages.map(m => {
                const apiMsg: AiChatMessage = { role: m.role === 'ai' ? 'assistant' : m.role, content: m.content || null };
                if (m.tool_calls) apiMsg.tool_calls = m.tool_calls;
                if (m.tool_call_id) apiMsg.tool_call_id = m.tool_call_id;
                return apiMsg;
            })
        ];

        // 发起流式请求的公共逻辑
        const doChatStream = async (chatApiMessages: AiChatMessage[], msgId: string) => {
            // 先添加一个空 AI 消息用于 UI 的流式填充
            setMessages(prev => [...prev, {
                id: msgId,
                role: 'ai',
                content: '',
                timestamp: Date.now()
            }]);

            let currentContent = '';
            let interceptedToolCalls: any[] = [];

            await new Promise<void>((resolve, reject) => {
                chatStream(chatApiMessages, configRef.current, activeController.signal, (event: StreamEvent) => {
                    if (event.type === 'content') {
                        currentContent += (event.content || '');
                        setMessages(prev =>
                            prev.map(m => m.id === msgId ? { ...m, content: currentContent } : m)
                        );
                    } else if (event.type === 'tool_call') {
                        // 拦截到完整拼装后的工具调用
                        interceptedToolCalls = event.tool_calls || [];
                    } else if (event.type === 'error') {
                        reject(new Error(event.content));
                    } else if (event.type === 'done') {
                        resolve();
                    }
                }).catch(reject);
            });

            return { currentContent, interceptedToolCalls };
        };

        try {
            // 多轮工具调用循环
            let currentChatMessages = [...baseChatMessages];
            let toolRound = 0;
            let finalContent = '';

            while (toolRound <= MAX_TOOL_ROUNDS) {
                if (activeController.signal.aborted) break;

                const msgId = (Date.now() + toolRound * 2 + 1).toString();
                const { currentContent, interceptedToolCalls } = await doChatStream(currentChatMessages, msgId);

                // 无工具调用 → 直接完成回复
                if (interceptedToolCalls.length === 0) {
                    finalContent = currentContent;
                    break;
                }

                // 达到工具调用轮次上限，强制结束
                if (toolRound >= MAX_TOOL_ROUNDS) {
                    finalContent = currentContent || '操作完成，但部分工具调用被跳过（已达最大轮次）。';
                    break;
                }

                onStatusChange?.('检索信息或操作设备中...');

                // 将 assistant 包含 tool_calls 的消息保存并追加到上下文
                const assistantToolMsg: Message = {
                    id: msgId,
                    role: 'ai',
                    content: currentContent || null,
                    tool_calls: interceptedToolCalls,
                    timestamp: Date.now()
                };
                setMessages(prev => prev.map(m => m.id === msgId ? assistantToolMsg : m));

                currentChatMessages.push({
                    role: 'assistant',
                    content: currentContent || null,
                    tool_calls: interceptedToolCalls
                } as AiChatMessage);

                // 执行工具
                let conn: Connection | null = null;
                if (interceptedToolCalls.some(tc => tc.function?.name === 'call_ha_service')) {
                    try { conn = await connectToHA(); } catch (e) { console.error('HA 连接失败', e); }
                }

                const toolResults = await executeHaTools(conn, entitiesRef.current, interceptedToolCalls);

                // 更新前端 UI 中的 Tool Messages
                const newToolMessages = toolResults.map(res => ({
                    id: `tool_${res.tool_call_id}`,
                    role: 'tool' as const,
                    tool_call_id: res.tool_call_id,
                    content: res.content,
                    timestamp: Date.now()
                }));
                setMessages(prev => [...prev, ...newToolMessages]);

                // 追加工具结果到对话上下文
                for (const res of toolResults) {
                    currentChatMessages.push({
                        role: 'tool',
                        tool_call_id: res.tool_call_id,
                        content: res.content
                    });
                }

                onStatusChange?.('生成回复中...');
                toolRound++;
            }

            // 通知 AI 回复完成（用于 TTS 等后续处理）
            if (finalContent && onAiReplyDone) {
                onAiReplyDone(finalContent);
            }
        } catch (error: any) {
            if (error.name === 'AbortError' || activeController.signal.aborted) {
                console.log('流式请求已中断');
            } else {
                const errorMsg: Message = {
                    id: (Date.now() + 5).toString(),
                    role: 'ai',
                    content: `出错了: ${error.message || '请检查网络或后端配置'}`,
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, errorMsg]);
                onError?.();
            }
        } finally {
            if (abortControllerRef.current === activeController) {
                setIsLoading(false);
                onStatusChange?.('');
                abortControllerRef.current = null;
            }
        }
    }, [inputValue, messages, isLoading, abortChat, onStatusChange, onAiReplyDone, onError]);

    // 清空对话记录
    const clearHistory = useCallback(() => {
        if (window.confirm('确定要清空聊天记录吗？')) {
            abortChat();
            setMessages([{
                ...WELCOME_MESSAGE,
                timestamp: Date.now()
            }]);
            // 同步清除 localStorage 中的持久化记录
            localStorage.removeItem(CHAT_HISTORY_KEY);
        }
    }, [abortChat]);

    return {
        messages,
        inputValue,
        setInputValue,
        isLoading,
        config,
        sendMessage,
        handleSaveConfig,
        clearHistory,
        abortChat
    };
}
