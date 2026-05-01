import { useState, useEffect, useCallback, useRef } from 'react';
import { AiConfig, DEFAULT_CONFIG, AiConfigSchema, providerSupportsToolCalling } from '@/services/ai-service';
import { chatStream, AiChatMessage, StreamEvent } from '@/services/ai-chat';
import { HassEntities } from 'home-assistant-js-websocket';
import { AiCallService, executeHaTools } from '@/services/ai-tools-executor';
import {
    createQuickControlPlan,
    executeQuickControlPlan,
    summarizeControlToolResults
} from '@/services/ai-quick-control';
import { getApiUrl } from '@/utils/sync';
import { getDeviceSummary, getSmartHomeContext, sanitizeAiResponseForDisplay } from '@/utils/ai-context';
import { logger } from '@/utils/logger';

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
    /** 复用主应用的 HA 服务调用链路，确保 AI 控制与卡片控制一致 */
    callService?: AiCallService;
    /** 当前 HA 是否已连接，用于生成更准确的控制反馈 */
    isHaConnected?: boolean;
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
    content: '你好！我是你的 AI 助手。你可以让我查看设备状态、统计传感器数据、控制灯光/窗帘/空调等设备，或根据当前状态给出自动化建议。',
    timestamp: Date.now()
};

/** 消息上下文窗口大小（约 6 轮对话） */
const MAX_CONTEXT_MESSAGES = 12;
/** 持久化保存的最大消息数 */
const MAX_PERSIST_MESSAGES = 50;
/** 多轮工具调用的最大轮次，防止死循环 */
const MAX_TOOL_ROUNDS = 3;
/** 持久化存储 key */
const CHAT_HISTORY_KEY = 'ai_chat_history';
/** 持久化节流间隔（毫秒） */
const PERSIST_THROTTLE_MS = 2000;
/** 语音识别和按钮连击可能产生相近文本，短时间内去重避免重复控制 */
const DUPLICATE_SUBMIT_WINDOW_MS = 1200;

function replaceMessageContent(messages: Message[], id: string, content: string): Message[] {
    return messages.map(message => message.id === id ? { ...message, content } : message);
}

function toVisibleHistoryMessage(message: Message): Message {
    return {
        id: message.id,
        role: message.role,
        content: message.content ?? '',
        timestamp: message.timestamp,
    };
}

function isDuplicateSubmission(currentText: string, previousText: string): boolean {
    return currentText === previousText
        || currentText.includes(previousText)
        || previousText.includes(currentText);
}

/**
 * AI 对话核心 Hook — 封装消息管理、配置加载/保存、消息发送逻辑
 */
export function useAiChat({
    entities,
    callService,
    isHaConnected = false,
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
    const callServiceRef = useRef(callService);
    callServiceRef.current = callService;
    const isHaConnectedRef = useRef(isHaConnected);
    isHaConnectedRef.current = isHaConnected;
    const configRef = useRef(config);
    configRef.current = config;
    const isVoiceModeRef = useRef(isVoiceMode);
    isVoiceModeRef.current = isVoiceMode;

    const abortControllerRef = useRef<AbortController | null>(null);
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSubmittedRef = useRef<{ text: string; timestamp: number } | null>(null);

    // 节流持久化消息到 localStorage
    useEffect(() => {
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(() => {
            try {
                // 只保存用户可见消息，避免 tool 角色或 tool_calls 污染下一轮请求。
                const toSave = messages
                    .filter(message => (message.role === 'user' || message.role === 'ai') && !message.tool_calls?.length)
                    .map(toVisibleHistoryMessage)
                    .slice(-MAX_PERSIST_MESSAGES);
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
            logger.error('保存 AI 配置到后端失败', e);
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
        if (!text) return;

        const now = Date.now();
        const lastSubmitted = lastSubmittedRef.current;
        if (
            lastSubmitted
            && now - lastSubmitted.timestamp < DUPLICATE_SUBMIT_WINDOW_MS
            && isDuplicateSubmission(text, lastSubmitted.text)
        ) {
            return;
        }
        lastSubmittedRef.current = { text, timestamp: now };

        // 若当前有正在生成的请求则中断它，让设备控制指令不被旧请求阻塞。
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

        const quickControlPlan = createQuickControlPlan(
            text,
            entitiesRef.current,
            isHaConnectedRef.current,
            Boolean(callServiceRef.current)
        );

        if (quickControlPlan) {
            if (quickControlPlan.kind === 'fail') {
                const failMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'ai',
                    content: quickControlPlan.finalMessage,
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, failMsg]);
                setIsLoading(false);
                onStatusChange?.('');
                onAiReplyDone?.(quickControlPlan.finalMessage);
                return;
            }

            const quickMsgId = (Date.now() + 1).toString();
            const quickMsg: Message = {
                id: quickMsgId,
                role: 'ai',
                content: quickControlPlan.pendingMessage,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, quickMsg]);
            onStatusChange?.(quickControlPlan.pendingMessage);

            try {
                // 先让“正在操作”消息进入渲染队列，再提交 HA 服务调用。
                await new Promise(resolve => setTimeout(resolve, 0));
                const finalMessage = await executeQuickControlPlan(
                    quickControlPlan,
                    entitiesRef.current,
                    callServiceRef.current as AiCallService
                );
                setMessages(prev => replaceMessageContent(prev, quickMsgId, finalMessage));
                onAiReplyDone?.(finalMessage);
            } catch (error: unknown) {
                const reason = error instanceof Error ? error.message : '未知原因';
                const finalMessage = `${quickControlPlan.actionLabel}失败：${reason}`;
                setMessages(prev => replaceMessageContent(prev, quickMsgId, finalMessage));
                onAiReplyDone?.(finalMessage);
                onError?.();
            } finally {
                setIsLoading(false);
                onStatusChange?.('');
            }
            return;
        }

        const activeController = new AbortController();
        abortControllerRef.current = activeController;

        // 构建设备上下文注入系统提示词。支持工具调用时不展开完整设备列表，避免每轮消耗过多 token。
        const deviceSummary = getDeviceSummary(entitiesRef.current);
        const supportsTools = providerSupportsToolCalling(configRef.current);
        const smartHomeContext = supportsTools
            ? '当前模型可通过工具查询实时设备，提示词中不展开完整设备列表。'
            : getSmartHomeContext(entitiesRef.current);
        const systemPrompt = `你是 HAUI 系统内置的 AI 助手，负责帮助用户查看设备状态、统计家庭传感器与设备数据、执行低风险设备控制，并给出实用的自动化建议。

工作边界：
1. 回答设备状态、统计、对比、异常排查时，优先使用可用工具 get_home_summary、find_entities 或 get_entity_state；如果当前模型不支持工具调用，则只能基于下方设备上下文回答，不要凭空猜测。
2. 控制设备前必须先明确目标 entity_id。用户只说“客厅灯”这类自然语言时，先查找候选设备；不确定时先询问用户。
3. 允许控制灯光、开关、窗帘、风扇、媒体播放器、空调、加湿器、扫地机器人、场景和脚本等低风险操作。
4. 不要直接执行门锁、安防解除、重启、全屋通配符或无法确认目标的批量操作；遇到这类请求要说明需要用户手动确认。
5. 控制类请求只回答最终短句：成功用“已打开/已关闭 + 设备名”，失败用“打开失败/关闭失败：原因”。不要输出查找过程、候选列表、entity_id、服务名、JSON 或“以 Home Assistant 回传为准”等解释。
6. 如果当前模型不支持工具调用，不要声称已经执行控制，只能说明需要切换支持工具调用的模型。
7. 回答保持极简。设备控制结果 1 句话，状态查询不超过 3 句话，只有用户明确要求时才展开。
8. 面向用户输出时只使用设备中文名或 friendly_name，不要展示 entity_id、英文 slug、下划线名称或图标名称；只有调用工具参数时才使用 entity_id。

连接状态：${isHaConnectedRef.current ? 'Home Assistant 已连接，允许提交低风险控制。' : 'Home Assistant 未连接或未就绪，只能查看当前缓存状态，不能执行控制。'}
工具调用能力：${supportsTools ? '当前模型支持工具调用，可查询实时状态并提交低风险控制。' : '当前模型不支持工具调用，只能基于设备上下文回答，不能执行控制。'}
设备摘要：${deviceSummary}

当前可用设备上下文：
${smartHomeContext}`;

        // 使用滑动窗口截取最近的消息，避免 token 超限
        const recentMessages = newMessages
            .slice(1)
            .filter(m => (m.role === 'user' || m.role === 'ai') && !m.tool_calls?.length)
            .map(toVisibleHistoryMessage)
            .slice(-MAX_CONTEXT_MESSAGES);
        const baseChatMessages: AiChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...recentMessages.map(m => {
                const apiMsg: AiChatMessage = { role: m.role === 'ai' ? 'assistant' : m.role, content: m.content ?? '' };  // DashScope 要求 content 不能为 null
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
                        const displayContent = sanitizeAiResponseForDisplay(currentContent, entitiesRef.current);
                        setMessages(prev =>
                            prev.map(m => m.id === msgId ? { ...m, content: displayContent } : m)
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
            const currentChatMessages = [...baseChatMessages];
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

                if (currentContent.trim()) {
                    const assistantToolMsg: Message = {
                        id: msgId,
                        role: 'ai',
                        content: sanitizeAiResponseForDisplay(currentContent, entitiesRef.current),
                        tool_calls: interceptedToolCalls,
                        timestamp: Date.now()
                    };
                    setMessages(prev => prev.map(m => m.id === msgId ? assistantToolMsg : m));
                } else {
                    setMessages(prev => prev.filter(m => m.id !== msgId));
                }

                currentChatMessages.push({
                    role: 'assistant',
                    content: currentContent || '',  // DashScope 要求 content 不能为 null
                    tool_calls: interceptedToolCalls
                } as AiChatMessage);

                // 执行工具：控制类工具复用主应用的 callService，避免绕过用户配置和连接状态。
                const safeCallService = isHaConnectedRef.current ? callServiceRef.current : undefined;
                const toolResults = await executeHaTools(entitiesRef.current, interceptedToolCalls, safeCallService);
                const compactControlResult = summarizeControlToolResults(
                    entitiesRef.current,
                    interceptedToolCalls,
                    toolResults
                );

                if (compactControlResult) {
                    setMessages(prev => {
                        const withoutCurrentAssistant = prev.filter(m => m.id !== msgId);
                        return [...withoutCurrentAssistant, {
                            id: (Date.now() + toolRound * 2 + 2).toString(),
                            role: 'ai',
                            content: compactControlResult,
                            timestamp: Date.now()
                        }];
                    });
                    finalContent = compactControlResult;
                    break;
                }

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
                onAiReplyDone(sanitizeAiResponseForDisplay(finalContent, entitiesRef.current));
            }
        } catch (error: unknown) {
            const err = error as Error & { name?: string };
            if (err.name === 'AbortError' || activeController.signal.aborted) {
            logger.info('流式请求已中断');
            } else {
                // 格式化错误消息，保留换行符以便显示详细提示
                const rawMessage = err.message || '请检查网络或后端配置';
                const formattedMessage = rawMessage.includes('【')
                    ? rawMessage  // 已包含格式化提示，直接显示
                    : `出错了: ${rawMessage}`;
                const errorMsg: Message = {
                    id: (Date.now() + 5).toString(),
                    role: 'ai',
                    content: formattedMessage,
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
