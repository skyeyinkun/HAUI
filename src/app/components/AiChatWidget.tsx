import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
// 安全修复: rehype-sanitize 过滤 AI 返回内容中的恶意 HTML/脚本
import rehypeSanitize from 'rehype-sanitize';
import {
    Bot, Send, X, Settings, Loader2, Sparkles, User as UserIcon,
    Eraser, PanelRight, PinOff, Mic, MicOff, Volume2
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useDragControls, Variants } from 'motion/react';
import { useAiChat, Message } from '@/hooks/useAiChat';
import { HassEntities } from 'home-assistant-js-websocket';
import AiSettingsModal from './AiSettingsModal';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

// 样式辅助函数
function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

// =====================================================================
// 子组件：语音模式状态指示器
// =====================================================================
interface VoiceStatusIndicatorProps {
    voiceStatus: 'idle' | 'listening' | 'thinking' | 'speaking';
    isSpeaking: boolean;
    interimTranscript: string;
}

function VoiceStatusIndicator({ voiceStatus, isSpeaking, interimTranscript }: VoiceStatusIndicatorProps) {
    return (
        <AnimatePresence>
            <motion.div
                key={voiceStatus}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex justify-center"
            >
                <div className={classNames(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium shadow-sm backdrop-blur-md",
                    voiceStatus === 'listening' && "bg-rose-50 text-rose-600 border border-rose-200",
                    voiceStatus === 'thinking' && "bg-amber-50 text-amber-600 border border-amber-200",
                    voiceStatus === 'speaking' && "bg-blue-50 text-blue-600 border border-blue-200",
                    voiceStatus === 'idle' && "bg-gray-50 text-gray-500 border border-gray-200",
                )}>
                    {voiceStatus === 'listening' && (
                        <>
                            <Mic className="w-3 h-3 animate-pulse" />
                            <span>正在聆听...</span>
                            {interimTranscript && <span className="opacity-60 max-w-[120px] truncate">{interimTranscript}</span>}
                        </>
                    )}
                    {voiceStatus === 'thinking' && (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>AI 思考中...</span>
                        </>
                    )}
                    {voiceStatus === 'speaking' && (
                        <>
                            <Volume2 className={classNames("w-3 h-3", isSpeaking && "animate-pulse")} />
                            <span>AI 说话中...</span>
                        </>
                    )}
                    {voiceStatus === 'idle' && (
                        <>
                            <Volume2 className="w-3 h-3" />
                            <span>语音对话已暂停</span>
                        </>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// =====================================================================
// 子组件：消息列表
// =====================================================================
interface ChatMessageListProps {
    messages: Message[];
    isLoading: boolean;
}

function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
    return (
        <>
            {messages.map((msg) => (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                    {/* 头像 */}
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/20 ${msg.role === 'user' ? 'bg-[#334155] text-white' : 'bg-white text-[#1E293B]'
                            }`}
                        style={msg.role === 'user' ? { backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" } : {}}
                    >
                        {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    {/* 消息气泡 */}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm backdrop-blur-sm ${msg.role === 'user'
                        ? 'bg-[#334155]/90 text-white rounded-tr-sm'
                        : 'bg-white/60 text-[#1E293B] border border-white/40 rounded-tl-sm'
                        }`}
                        style={msg.role === 'user' ? { backgroundImage: "linear-gradient(163.817deg, rgba(60, 60, 65, 0.9) 1.2863%, rgba(45, 45, 48, 0.9) 103.1%)" } : {}}
                    >
                        {msg.role === 'ai' ? (
                            <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-800/50 prose-pre:backdrop-blur prose-pre:text-gray-100 prose-code:text-blue-600 prose-code:bg-blue-50/50 prose-code:px-1 prose-code:rounded">
                                {/* 安全修复: rehypeSanitize 净化 AI 输出 */}
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
            {/* 加载指示器 */}
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
        </>
    );
}

// =====================================================================
// 子组件：聊天输入区域
// =====================================================================
interface ChatInputProps {
    inputValue: string;
    onChange: (val: string) => void;
    onSend: () => void;
    isLoading: boolean;
    isListening: boolean;
    isSpeechSupported: boolean;
    onToggleMic: () => void;
    onStopListening: () => void;
}

function ChatInput({
    inputValue, onChange, onSend, isLoading,
    isListening, isSpeechSupported, onToggleMic, onStopListening
}: ChatInputProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (isListening) onStopListening();
            onSend();
        }
    };

    return (
        <div className="p-4 bg-white/40 border-t border-white/50 backdrop-blur-md shrink-0">
            <div className="relative flex flex-col gap-2 bg-white/60 p-2 rounded-[20px] border border-white/50 focus-within:border-[#334155]/50 focus-within:ring-1 focus-within:ring-[#334155]/20 transition-all shadow-sm">
                {/* 录音指示条 */}
                {isListening && (
                    <div className="flex items-center gap-2 px-3 pt-1 text-xs text-rose-500 animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>正在聆听...</span>
                    </div>
                )}
                <div className="flex items-end gap-2 px-1">
                    {/* 语音录入按钮 */}
                    {isSpeechSupported && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onToggleMic}
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
                    {/* 文字输入框 */}
                    <textarea
                        value={inputValue}
                        onChange={(e) => {
                            if (isListening) onStopListening();
                            onChange(e.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={isListening ? "请说话..." : "输入指令..."}
                        className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-24 min-h-[44px] py-2.5 px-1 text-sm text-[#1E293B] placeholder:text-gray-500/70"
                        rows={1}
                        style={{ height: 'auto', minHeight: '44px' }}
                    />
                    {/* 发送按钮 */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            if (isListening) onStopListening();
                            onSend();
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
    );
}

// =====================================================================
// 主组件：AiChatWidget
// =====================================================================
interface AiChatWidgetProps {
    entities: HassEntities;
}

type ViewMode = 'floating' | 'sidebar' | 'minimized';

export default function AiChatWidget({ entities }: AiChatWidgetProps) {
    // UI 状态
    const [viewMode, setViewMode] = useState<ViewMode>('floating');
    const [isVisible, setIsVisible] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // 语音对话模式
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const isMobile = useIsMobile();

    // TTS 朗读 Hook
    const { speak, cancel: cancelSpeak, isSpeaking, isSupported: isTtsSupported } = useSpeechSynthesis();

    // 用 ref 保存最新的 isVoiceMode
    const isVoiceModeRef = useRef(isVoiceMode);
    isVoiceModeRef.current = isVoiceMode;

    // AI 回复完成后的处理：TTS 朗读 + 重新激活麦克风
    const handleAiReplyDone = useCallback((content: string) => {
        if (isVoiceModeRef.current && isTtsSupported && content) {
            setVoiceStatus('speaking');
            speak(content, () => {
                // TTS 朗读结束，若仍处于语音对话模式则重新激活麦克风
                if (isVoiceModeRef.current) {
                    setVoiceStatus('listening');
                    resetTranscript();
                    startListening();
                }
            });
        } else if (isVoiceModeRef.current) {
            // 不支持 TTS 时直接重新监听
            setVoiceStatus('listening');
            resetTranscript();
            startListening();
        }
    }, [isTtsSupported]); // speak/startListening/resetTranscript 通过下方定义

    const handleAiError = useCallback(() => {
        if (isVoiceModeRef.current) setVoiceStatus('idle');
    }, []);

    // AI 对话 Hook
    const {
        messages, inputValue, setInputValue, isLoading,
        config, sendMessage, handleSaveConfig, clearHistory
    } = useAiChat({
        entities,
        isVoiceMode,
        onAiReplyDone: handleAiReplyDone,
        onError: handleAiError,
    });

    // sendMessageRef 让 handleVoiceSpeechEnd 能调用最新的 sendMessage
    const sendMessageRef = useRef<((text: string) => void) | null>(null);

    // 语音输入结束后自动发送
    const handleVoiceSpeechEnd = useCallback((finalText: string) => {
        if (finalText.trim()) {
            setInputValue(finalText.trim());
            if (isVoiceModeRef.current) setVoiceStatus('thinking');
            setTimeout(() => sendMessageRef.current?.(finalText.trim()), 50);
        }
    }, [setInputValue]);

    // 语音识别 Hook（支持自动重启）
    const {
        isListening, transcript, interimTranscript,
        isSupported: isSpeechSupported,
        startListening, stopListening, resetTranscript
    } = useSpeechRecognition({
        onSpeechEnd: handleVoiceSpeechEnd,
        autoRestart: isVoiceMode,
    });

    // 注册 sendMessage 到 ref
    useEffect(() => {
        sendMessageRef.current = (text: string) => sendMessage(text);
    }, [sendMessage]);

    // 语音识别内容实时同步到输入框
    useEffect(() => {
        if (transcript || interimTranscript) {
            setInputValue((transcript + interimTranscript).trim());
        }
    }, [transcript, interimTranscript, setInputValue]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // 自动滚动到底部
    useEffect(() => {
        if (isVisible && viewMode !== 'minimized') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isVisible, viewMode]);

    // 快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'd') {
                e.preventDefault();
                setIsVisible(prev => !prev);
            }
            if (e.key === 'Escape' && isVisible && viewMode !== 'minimized') {
                setIsVisible(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, viewMode]);

    // 语音模式切换处理
    const toggleVoiceMode = useCallback(() => {
        const next = !isVoiceMode;
        setIsVoiceMode(next);
        if (next) {
            // 开启语音模式：中断现有朗读，重置并开始监听
            cancelSpeak();
            // 某些手机端浏览器需要用户手势解锁 Web Audio / Speech
            speak('');
            resetTranscript();
            setVoiceStatus('listening');
            setTimeout(() => startListening(), 200);
        } else {
            // 关闭语音模式：停止录音和朗读
            stopListening();
            cancelSpeak();
            setVoiceStatus('idle');
        }
    }, [isVoiceMode, cancelSpeak, speak, resetTranscript, startListening, stopListening]);

    // 麦克风按钮切换
    const toggleMic = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            resetTranscript();
            startListening();
        }
    }, [isListening, stopListening, resetTranscript, startListening]);

    // 发送消息时停止语音
    const handleSend = useCallback(() => {
        if (isListening) stopListening();
        if (isSpeaking) cancelSpeak();
        if (isVoiceMode) setVoiceStatus('thinking');
        sendMessage();
    }, [isListening, isSpeaking, isVoiceMode, stopListening, cancelSpeak, sendMessage]);

    // 拖拽关闭逻辑（移动端下滑关闭）
    const handleDragEnd = (_: any, info: PanInfo) => {
        if (isMobile && info.offset.y > 100) {
            setIsVisible(false);
        }
    };

    // 动画变体
    const variants: Variants = {
        hidden: { opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2, ease: "easeOut" } },
        visible: { opacity: 1, scale: 1, y: 0, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
        sidebar: {
            opacity: 1, x: 0, y: 0, right: 0, top: 0,
            height: '100vh', width: isMobile ? '100%' : '30%',
            borderRadius: 0, scale: 1,
            transition: { type: 'spring', stiffness: 300, damping: 30 }
        },
        minimized: { opacity: 0, scale: 0, transition: { duration: 0.2 } }
    };

    // 侧边栏/浮窗样式
    const sidebarClass = viewMode === 'sidebar'
        ? 'fixed top-0 right-0 h-full w-full md:w-[40%] lg:w-[30%] rounded-none border-l'
        : 'fixed bottom-24 left-1/2 -translate-x-1/2 w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-120px)] rounded-[24px] border';

    // 未展开时显示触发按钮
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
                        dragListener={false}
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
                        {/* ===== 标题栏 / 拖拽把手 ===== */}
                        <div
                            className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50 shrink-0 cursor-grab active:cursor-grabbing select-none"
                            style={{ backgroundImage: "linear-gradient(163.817deg, rgba(60, 60, 65, 0.9) 1.2863%, rgba(45, 45, 48, 0.9) 103.1%)" }}
                            onPointerDown={(e) => { if (viewMode === 'floating') dragControls.start(e); }}
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

                            {/* 窗口控制按钮组 */}
                            <div className="flex items-center gap-1 text-white/70" onPointerDown={(e) => e.stopPropagation()}>
                                {/* 语音对话模式切换 */}
                                {(isSpeechSupported || isTtsSupported) ? (
                                    <button
                                        onClick={toggleVoiceMode}
                                        className={classNames(
                                            "p-1.5 rounded-lg transition-all relative",
                                            isVoiceMode
                                                ? "bg-rose-500/80 text-white"
                                                : "hover:bg-white/10 text-white/90"
                                        )}
                                        title={isVoiceMode ? "关闭语音对话" : "开启语音对话"}
                                    >
                                        {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                        {!isVoiceMode && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
                                        )}
                                    </button>
                                ) : (
                                    <button className="p-1.5 opacity-30 cursor-not-allowed" title="当前环境不支持语音 API (需 HTTPS)">
                                        <Volume2 className="w-4 h-4 text-white" />
                                    </button>
                                )}

                                {/* 侧边栏/浮窗模式切换（仅桌面端） */}
                                {!isMobile && (
                                    <button
                                        onClick={() => setViewMode(prev => prev === 'sidebar' ? 'floating' : 'sidebar')}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                        title={viewMode === 'sidebar' ? "浮窗模式" : "侧边栏模式"}
                                    >
                                        {viewMode === 'sidebar' ? <PinOff className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
                                    </button>
                                )}

                                <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="设置">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={clearHistory} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/90" title="清空">
                                    <Eraser className="w-4 h-4" />
                                </button>
                                <div className="w-px h-3 bg-white/20 mx-1" />
                                <button onClick={() => setIsVisible(false)} className="p-1.5 hover:bg-red-500/80 hover:text-white rounded-lg transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* ===== 消息区域 ===== */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar bg-gradient-to-b from-transparent to-gray-50/30">
                            <ChatMessageList messages={messages} isLoading={isLoading} />

                            {/* 语音对话模式状态提示 */}
                            {isVoiceMode && (
                                <VoiceStatusIndicator
                                    voiceStatus={voiceStatus}
                                    isSpeaking={isSpeaking}
                                    interimTranscript={interimTranscript}
                                />
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ===== 输入区域 ===== */}
                        <ChatInput
                            inputValue={inputValue}
                            onChange={setInputValue}
                            onSend={handleSend}
                            isLoading={isLoading}
                            isListening={isListening}
                            isSpeechSupported={isSpeechSupported}
                            onToggleMic={toggleMic}
                            onStopListening={stopListening}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 设置模态框 */}
            <AiSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={handleSaveConfig}
                initialConfig={config}
            />
        </>
    );
}
