import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
// 安全修复 #1: 引入 rehype-sanitize，过滤 AI 返回内容中的恶意 HTML/脚本
import rehypeSanitize from 'rehype-sanitize';
import {
    Bot, Send, X, Settings, Loader2, Sparkles, User as UserIcon,
    Eraser, PanelRight, PinOff, Mic
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useDragControls, Variants } from 'motion/react';
import { AiConfig, DEFAULT_CONFIG, AiConfigSchema } from '@/services/ai-service';
import { chatStream, AiChatMessage, StreamEvent } from '@/services/ai-chat';
import { getSmartHomeContext } from '@/utils/ai-context';
import { HassEntities } from 'home-assistant-js-websocket';
import AiSettingsModal from './AiSettingsModal';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { decryptToken } from '@/utils/security';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

// Fallback for cn if not found
function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

interface AiChatWidgetProps {
    entities: HassEntities;
}

type ViewMode = 'floating' | 'sidebar' | 'minimized';

export default function AiChatWidget({ entities }: AiChatWidgetProps) {
    // UI State
    const [viewMode, setViewMode] = useState<ViewMode>('floating');
    const [isVisible, setIsVisible] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const isMobile = useIsMobile();

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'ai',
            content: '你好！我是你的 AI 智能管家。我可以帮你查看设备状态、提供自动化建议。请问有什么可以帮你的吗？',
            timestamp: Date.now()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);

    const {
        isListening,
        transcript,
        interimTranscript,
        isSupported: isSpeechSupported,
        startListening,
        stopListening,
        resetTranscript
    } = useSpeechRecognition();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // 当语音识别到新内容时，将其放入输入框
    useEffect(() => {
        if (transcript || interimTranscript) {
            setInputValue((transcript + interimTranscript).trim());
        }
    }, [transcript, interimTranscript]);
    useEffect(() => {
        // AI 的配置依然向后端提交一份，确保前后端一致。这里只做前端默认展示用。
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

    // Auto scroll
    useEffect(() => {
        if (isVisible && viewMode !== 'minimized') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isVisible, viewMode]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Toggle: Cmd/Ctrl + Shift + D
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
                e.preventDefault();
                setIsVisible(prev => !prev);
            }
            // Esc to minimize/close
            if (e.key === 'Escape') {
                if (isVisible && viewMode !== 'minimized') {
                    setIsVisible(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, viewMode]);

    // Logic
    const handleSaveConfig = async (newConfig: AiConfig) => {
        setConfig(newConfig);
        localStorage.setItem('ai_config', JSON.stringify(newConfig));
        setIsSettingsOpen(false);

        // 同步配置到后端
        try {
            await fetch('/api/ai/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
        } catch (e) {
            console.error('保存 AI 配置到后端失败', e);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        const aiMsgId = (Date.now() + 1).toString();

        const contextData = getSmartHomeContext(entities);
        // 为了节省 Token，把上下文压缩到第一条用户消息或 System 提示中
        const systemPromptMsg: AiChatMessage = {
            role: 'user',
            content: `[系统上下文] 当前设备状态:\n${contextData}\n[上下文结束]\n\n${userMsg.content}`
        };

        // 构建传给后端的对历史（跳过第一条欢迎语）
        const chatApiMessages: AiChatMessage[] = [
            {
                role: 'system',
                content: '你是一个专业的家庭自动化管家，可以使用提供的 Tool 来操控家庭设备或查询状态。回答用户要简练亲切。'
            },
            ...messages.slice(1).map(m => ({ role: m.role, content: m.content }) as AiChatMessage),
            systemPromptMsg
        ];

        // 占位消息
        setMessages(prev => [...prev, {
            id: aiMsgId,
            role: 'ai',
            content: '',
            timestamp: Date.now()
        }]);

        try {
            // 从 HAConfig 读取 HA Token（解密）
            let haToken = null;
            const haConfigStr = localStorage.getItem('ha_config');
            if (haConfigStr) {
                const rawHaConfig = JSON.parse(haConfigStr);
                if (rawHaConfig.token) haToken = decryptToken(rawHaConfig.token);
            }

            let currentContent = '';

            await chatStream(chatApiMessages, haToken, (event: StreamEvent) => {
                if (event.type === 'content') {
                    currentContent += (event.content || '');
                    setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: currentContent } : m));
                } else if (event.type === 'tool_call') {
                    // 这里展示 toolcall
                    if (event.action === '执行成功') {
                        // 将后端实际控制成功的日志上报到 UI 层，以便通知用户和联动
                        const { domain, service } = event.data;
                        console.log('[AiChat] 后端已执行控制指令', domain, service);
                        // 注意：这里实际操作已经在后端生效了，前端仅为了兼容可能的状态更新而调用 callService
                        // 为避免重复下发，前端不再次 throw callService，仅依赖 HA 推送的状态更新
                    }
                } else if (event.type === 'error') {
                    const errMsg: Message = {
                        id: Date.now().toString(),
                        role: 'ai',
                        content: `❌ 出错了: ${event.content}`,
                        timestamp: Date.now()
                    };
                    setMessages(prev => [...prev, errMsg]);
                } else if (event.type === 'done') {
                    setIsLoading(false);
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
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearHistory = () => {
        if (window.confirm('确定要清空聊天记录吗？')) {
            setMessages([{
                id: 'welcome',
                role: 'ai',
                content: '你好！我是你的 AI 智能管家。我可以帮你查看设备状态、提供自动化建议。请问有什么可以帮你的吗？',
                timestamp: Date.now()
            }]);
        }
    };

    // Drag logic for mobile swipe down to close
    const handleDragEnd = (_: any, info: PanInfo) => {
        if (isMobile && info.offset.y > 100) {
            setIsVisible(false);
        }
    };

    // Render Variants
    const variants: Variants = {
        hidden: {
            opacity: 0,
            scale: 0.9,
            y: 20,
            transition: { duration: 0.2, ease: "easeOut" }
        },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            x: 0,
            transition: { duration: 0.2, ease: "easeOut" }
        },
        sidebar: {
            opacity: 1,
            x: 0,
            y: 0,
            right: 0,
            top: 0,
            height: '100vh',
            width: isMobile ? '100%' : '30%', // Mobile overrides this anyway via className
            borderRadius: 0,
            scale: 1,
            transition: { type: 'spring', stiffness: 300, damping: 30 }
        },
        minimized: {
            opacity: 0,
            scale: 0,
            transition: { duration: 0.2 }
        }
    };

    // Determine width class for sidebar mode
    const sidebarClass = viewMode === 'sidebar'
        ? 'fixed top-0 right-0 h-full w-full md:w-[40%] lg:w-[30%] rounded-none border-l'
        : 'fixed bottom-24 left-1/2 -translate-x-1/2 w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-120px)] rounded-[24px] border';

    if (!isVisible) {
        return (
            <motion.button
                data-testid="ai-trigger-btn"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsVisible(true)}
                className="fixed bottom-8 right-24 z-50 w-12 h-12 rounded-full shadow-[0px_4px_24px_0px_rgba(0,0,0,0.2)] flex items-center justify-center text-white backdrop-blur-md"
                style={{ backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
            >
                <Sparkles className="w-5 h-5" />
            </motion.button>
        );
    }

    return (
        <>
            <AnimatePresence mode="wait">
                {isVisible && (
                    <motion.div
                        data-testid="ai-widget-container"
                        layout
                        initial="hidden"
                        animate={viewMode === 'sidebar' ? 'sidebar' : 'visible'}
                        exit="hidden"
                        variants={variants}
                        drag={viewMode === 'floating'}
                        dragListener={false} // Only drag via handle
                        dragControls={dragControls}
                        dragMomentum={false}
                        dragElastic={0.1}
                        onDragEnd={handleDragEnd}
                        className={classNames(
                            "z-[100] bg-white/80 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden origin-bottom-right",
                            sidebarClass,
                            isMobile && viewMode !== 'sidebar' && "fixed bottom-0 left-0 right-0 w-full h-[85vh] rounded-t-[24px] rounded-b-none translate-x-0 bottom-0 top-auto max-w-none"
                        )}
                        style={viewMode === 'floating' && !isMobile ? {
                            position: 'fixed',
                            left: 'calc(50% - 190px)',
                            top: 'calc(50% - 300px)'
                        } : undefined}
                    >
                        {/* Header / Drag Handle */}
                        <div
                            className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50 shrink-0 cursor-grab active:cursor-grabbing select-none"
                            style={{ backgroundImage: "linear-gradient(163.817deg, rgba(60, 60, 65, 0.9) 1.2863%, rgba(45, 45, 48, 0.9) 103.1%)" }}
                            onPointerDown={(e) => {
                                if (viewMode === 'floating') dragControls.start(e);
                            }}
                        >
                            <div className="flex items-center gap-3 text-white">
                                <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-semibold text-sm tracking-wide leading-none">AI 智能管家</h3>
                                    <div className="flex items-center gap-1.5 mt-1 opacity-80">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                        <span className="text-[10px] font-medium">{config.modelName}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Window Controls */}
                            <div className="flex items-center gap-1 text-white/70" onPointerDown={(e) => e.stopPropagation()}>
                                {/* Toggle Sidebar/Floating (Desktop only) */}
                                {!isMobile && (
                                    <button
                                        onClick={() => setViewMode(prev => prev === 'sidebar' ? 'floating' : 'sidebar')}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        title={viewMode === 'sidebar' ? "浮窗模式" : "侧边栏模式"}
                                    >
                                        {viewMode === 'sidebar' ? <PinOff className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    title="设置"
                                >
                                    <Settings className="w-3.5 h-3.5" />
                                </button>

                                <button
                                    onClick={clearHistory}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    title="清空"
                                >
                                    <Eraser className="w-3.5 h-3.5" />
                                </button>

                                <div className="w-px h-3 bg-white/20 mx-1" />

                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="p-1.5 hover:bg-red-500/80 hover:text-white rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-gradient-to-b from-transparent to-gray-50/30">
                            {messages.map((msg) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/20 ${msg.role === 'user' ? 'bg-[#334155] text-white' : 'bg-white text-[#1E293B]'
                                            }`}
                                        style={msg.role === 'user' ? { backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" } : {}}
                                    >
                                        {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm backdrop-blur-sm ${msg.role === 'user'
                                        ? 'bg-[#334155]/90 text-white rounded-tr-sm'
                                        : 'bg-white/60 text-[#1E293B] border border-white/40 rounded-tl-sm'
                                        }`}
                                        style={msg.role === 'user' ? { backgroundImage: "linear-gradient(163.817deg, rgba(60, 60, 65, 0.9) 1.2863%, rgba(45, 45, 48, 0.9) 103.1%)" } : {}}
                                    >
                                        {msg.role === 'ai' ? (
                                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-800/50 prose-pre:backdrop-blur prose-pre:text-gray-100 prose-code:text-blue-600 prose-code:bg-blue-50/50 prose-code:px-1 prose-code:rounded">
                                                {/* 安全修复 #1: rehypeSanitize 净化 AI 输出，防止 XSS / Prompt 注入攻击 */}
                                                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white text-[#1E293B] flex items-center justify-center shrink-0 shadow-sm border border-gray-100">
                                        <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-white/60 px-4 py-3 rounded-2xl rounded-tl-sm border border-white/40 shadow-sm flex items-center gap-2 backdrop-blur-sm">
                                        <span className="w-1.5 h-1.5 bg-[#334155] rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <span className="w-1.5 h-1.5 bg-[#334155] rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <span className="w-1.5 h-1.5 bg-[#334155] rounded-full animate-bounce" />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white/40 border-t border-white/50 backdrop-blur-md shrink-0">
                            <div className="relative flex flex-col gap-2 bg-white/60 p-2 rounded-[20px] border border-white/50 focus-within:border-[#334155]/50 focus-within:ring-1 focus-within:ring-[#334155]/20 transition-all shadow-sm">
                                {isListening && (
                                    <div className="flex items-center gap-2 px-3 pt-1 text-xs text-rose-500 animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                                        <span>正在聆听...</span>
                                    </div>
                                )}
                                <div className="flex items-end gap-2 px-1">
                                    {isSpeechSupported && (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                                if (isListening) {
                                                    stopListening();
                                                } else {
                                                    resetTranscript();
                                                    startListening();
                                                }
                                            }}
                                            className={classNames(
                                                "p-2.5 rounded-[16px] transition-all mb-0.5 shadow-sm",
                                                isListening
                                                    ? "bg-rose-100 text-rose-600 border border-rose-200"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            )}
                                            title={isListening ? "点击停止录音" : "点击开始说话"}
                                        >
                                            <Mic className="w-4 h-4" />
                                        </motion.button>
                                    )}
                                    <textarea
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isListening ? "请说话..." : "输入指令..."}
                                        className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-24 min-h-[44px] py-2.5 px-1 text-sm text-[#1E293B] placeholder:text-gray-500/70"
                                        rows={1}
                                        style={{ height: 'auto', minHeight: '44px' }}
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            if (isListening) stopListening();
                                            handleSend();
                                        }}
                                        disabled={!inputValue.trim() || isLoading}
                                        className="p-2.5 text-white rounded-[16px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-0.5 shadow-md shrink-0"
                                        style={{ backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Settings Modal */}
            <AiSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveConfig}
                initialConfig={config}
            />
        </>
    );
}
