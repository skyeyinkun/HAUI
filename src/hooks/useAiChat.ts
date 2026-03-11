import { useState, useEffect, useCallback, useRef } from 'react';
import { AiConfig, DEFAULT_CONFIG, AiConfigSchema } from '@/services/ai-service';
import { chatStream, AiChatMessage, StreamEvent } from '@/services/ai-chat';
import { HassEntities, Connection } from 'home-assistant-js-websocket';
import { connectToHA } from '@/utils/ha-connection';
import { executeHaTools } from '@/services/ai-tools-executor';
import { getApiUrl } from '@/utils/sync';

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
    const [messages, setMessages] = useState<Message[]>([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
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

        // 构建系统提示，不再塞入全量的实体状态
        const baseChatMessages: AiChatMessage[] = [
            {
                role: 'system',
                content: '你是一个专业的家庭自动化管家。根据用户的指令，你可以通过 call_ha_service 工具操纵家庭设备。如果需要当前设备状态，必须先通过 get_entity_state 工具查询然后再回答用户。回答要简练、亲切！语音对话时尽量缩减篇幅。当无法查到设备或者调用报错时如实告知用户。'
            },
            ...newMessages.slice(1).map(m => {
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
            // == 第一轮请求：可能直接返回对话，或抛出工具请求 ==
            const aiMsgId = (Date.now() + 1).toString();
            const { currentContent, interceptedToolCalls } = await doChatStream(baseChatMessages, aiMsgId);

            if (interceptedToolCalls.length > 0) {
                onStatusChange?.('检索信息或操作设备中...');
                
                // 1. 将 assistant 包含 tool_calls 的消息保存并追加到上下文
                const assistantToolMsg: Message = {
                    id: aiMsgId,
                    role: 'ai',
                    content: currentContent || null,
                    tool_calls: interceptedToolCalls,
                    timestamp: Date.now()
                };
                
                // 将前面添加的占位空消息替换为实际包含工具调用的消息
                setMessages(prev => prev.map(m => m.id === aiMsgId ? assistantToolMsg : m));
                
                const nextChatMessages = [...baseChatMessages, {
                    role: 'assistant',
                    content: currentContent || null,
                    tool_calls: interceptedToolCalls
                } as AiChatMessage];

                const toolResults: { tool_call_id: string; content: string }[] = [];
                let conn: Connection | null = null;
                
                // 2. 前端拦截并根据工具类型进行“本地环境提取”或“真实服务调用”
                for (const tc of interceptedToolCalls) {
                    if (tc.function.name === 'get_entity_state') {
                        try {
                            const args = JSON.parse(tc.function.arguments);
                            const entity = entitiesRef.current[args.entity_id];
                            // 返回设备主要状态与 friendly_name 等精简数据以节约 Token
                            const content = entity 
                                ? JSON.stringify({ state: entity.state, friendly_name: entity.attributes?.friendly_name }) 
                                : 'Entity not found';
                            toolResults.push({ tool_call_id: tc.id, content });
                        } catch (e) {
                            toolResults.push({ tool_call_id: tc.id, content: 'Failed to parse JSON arguments' });
                        }
                    } else if (tc.function.name === 'call_ha_service') {
                        try {
                            if (!conn) conn = await connectToHA();
                            const res = await executeHaTools(conn, entitiesRef.current, [tc]);
                            if (res && res.length > 0) toolResults.push(res[0]);
                        } catch (e: any) {
                            toolResults.push({ tool_call_id: tc.id, content: e.message || 'Error occurred.' });
                        }
                    }
                }

                // 更新前端 UI 中的 Tool Messages
                const newToolMessages = toolResults.map(res => ({
                    id: `tool_${res.tool_call_id}`,
                    role: 'tool' as const,
                    tool_call_id: res.tool_call_id,
                    content: res.content,
                    timestamp: Date.now()
                }));
                setMessages(prev => [...prev, ...newToolMessages]);

                // 追加进对话历史进入下一轮
                for (const res of toolResults) {
                    nextChatMessages.push({
                        role: 'tool',
                        tool_call_id: res.tool_call_id,
                        content: res.content
                    });
                }

                if (!activeController.signal.aborted) {
                    // 3. 将工具执行结果提交回大模型进行最终答复
                    onStatusChange?.('生成回复中...');
                    const secondMsgId = (Date.now() + 2).toString();
                    const { currentContent: finalContent } = await doChatStream(nextChatMessages, secondMsgId);
                    
                    if (finalContent && onAiReplyDone) {
                        onAiReplyDone(finalContent);
                    }
                }
            } else {
                // 没有发生工具调用，直接完成了回复
                if (currentContent && onAiReplyDone) {
                    onAiReplyDone(currentContent);
                }
            }
        } catch (error: any) {
            if (error.name === 'AbortError' || activeController.signal.aborted) {
                console.log('Stream request aborted.');
            } else {
                const errorMsg: Message = {
                    id: (Date.now() + 5).toString(),
                    role: 'ai',
                    content: `❌ 出错了: ${error.message || '请检查网络或后端配置'}`,
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
