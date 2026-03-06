import { useState, useEffect, useCallback, useRef } from 'react';
import { AiConfig, DEFAULT_CONFIG, AiConfigSchema } from '@/services/ai-service';
import { chatStream, AiChatMessage, StreamEvent } from '@/services/ai-chat';
import { getSmartHomeContext } from '@/utils/ai-context';
import { HassEntities } from 'home-assistant-js-websocket';
import { decryptToken } from '@/utils/security';

// 消息类型定义
export interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

// Hook 选项
export interface UseAiChatOptions {
    entities: HassEntities;
    /** 语音模式开关 */
    isVoiceMode: boolean;
    /** AI 回复完成后回调（用于 TTS 朗读等后续处理） */
    onAiReplyDone?: (content: string) => void;
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
    onError,
}: UseAiChatOptions): UseAiChatReturn {
    const [messages, setMessages] = useState<Message[]>([{ ...WELCOME_MESSAGE, timestamp: Date.now() }]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);

    // 使用 ref 保存最新值，避免 useCallback 闭包捕获旧值
    const isVoiceModeRef = useRef(isVoiceMode);
    isVoiceModeRef.current = isVoiceMode;
    const isLoadingRef = useRef(isLoading);
    isLoadingRef.current = isLoading;
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const onAiReplyDoneRef = useRef(onAiReplyDone);
    onAiReplyDoneRef.current = onAiReplyDone;
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

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
        fetch('/api/ai/config')
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
            await fetch('/api/ai/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
        } catch (e) {
            console.error('保存 AI 配置到后端失败', e);
        }
    }, []);

    // 核心发送函数
    const sendMessage = useCallback(async (textOverride?: string) => {
        const text = (textOverride ?? inputValue).trim();
        if (!text || isLoadingRef.current) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        const aiMsgId = (Date.now() + 1).toString();
        const contextData = getSmartHomeContext(entities);

        // 构建系统提示 + 上下文
        const systemPromptMsg: AiChatMessage = {
            role: 'user',
            content: `[系统上下文] 当前设备状态:\n${contextData}\n[上下文结束]\n\n${text}`
        };

        const chatApiMessages: AiChatMessage[] = [
            {
                role: 'system',
                content: '你是一个专业的家庭自动化管家，可以使用提供的 Tool 来操控家庭设备或查询状态。回答用户要简练亲切。语音对话时回答要更简短，不超过三句话。当用户请求控制设备时，先使用 call_ha_service 工具执行操作，然后用自然语言告知结果。当用户询问设备状态时，使用 get_entity_state 工具查询后再回答。'
            },
            // 历史消息（去掉欢迎消息）
            ...messagesRef.current.slice(1).map(m => ({
                role: m.role,
                content: m.content
            }) as AiChatMessage),
            systemPromptMsg
        ];

        // 先添加一个空 AI 消息用于流式填充
        setMessages(prev => [...prev, {
            id: aiMsgId,
            role: 'ai',
            content: '',
            timestamp: Date.now()
        }]);

        try {
            let haToken: string | null = null;
            const haConfigStr = localStorage.getItem('ha_config');
            if (haConfigStr) {
                const rawHaConfig = JSON.parse(haConfigStr);
                if (rawHaConfig.token) haToken = decryptToken(rawHaConfig.token);
            }

            let currentContent = '';

            await chatStream(chatApiMessages, haToken, (event: StreamEvent) => {
                if (event.type === 'content') {
                    currentContent += (event.content || '');
                    setMessages(prev =>
                        prev.map(m => m.id === aiMsgId
                            ? { ...m, content: currentContent }
                            : m
                        )
                    );
                } else if (event.type === 'tool_call') {
                    const action = event.action || '';
                    const data = event.data || {};
                    console.log('[AiChat] 后端工具调用', action, data);
                } else if (event.type === 'error') {
                    const errMsg: Message = {
                        id: Date.now().toString(),
                        role: 'ai',
                        content: `❌ 出错了: ${event.content}`,
                        timestamp: Date.now()
                    };
                    setMessages(prev => [...prev, errMsg]);
                    onErrorRef.current?.();
                } else if (event.type === 'done') {
                    setIsLoading(false);
                    // 回调通知调用方 AI 已回复完成
                    if (currentContent) {
                        onAiReplyDoneRef.current?.(currentContent);
                    }
                }
            });
        } catch (error: any) {
            const errorMsg: Message = {
                id: (Date.now() + 2).toString(),
                role: 'ai',
                content: `❌ 出错了: ${error.message || '请检查网络或后端配置'}`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
            setIsLoading(false);
            onErrorRef.current?.();
        }
    }, [inputValue, entities]);

    // 清空对话记录
    const clearHistory = useCallback(() => {
        if (window.confirm('确定要清空聊天记录吗？')) {
            setMessages([{
                ...WELCOME_MESSAGE,
                timestamp: Date.now()
            }]);
        }
    }, []);

    return {
        messages,
        inputValue,
        setInputValue,
        isLoading,
        config,
        sendMessage,
        handleSaveConfig,
        clearHistory,
    };
}
