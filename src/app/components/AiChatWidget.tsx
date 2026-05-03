import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
// 安全修复: rehype-sanitize 过滤 AI 返回内容中的恶意 HTML/脚本
import rehypeSanitize from 'rehype-sanitize';
import {
    Bot, X, Settings, Loader2, Sparkles, User as UserIcon,
    Eraser, PanelRight, PinOff, Mic, Volume2, Keyboard, ArrowUp, VolumeX, Pause, Play, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useDragControls, Variants } from 'motion/react';
import { AiActionConfirmRequest, useAiChat, Message } from '@/hooks/useAiChat';
import { HassEntities } from 'home-assistant-js-websocket';
import { AiCallService } from '@/services/ai-tools-executor';
import AiSettingsModal from './AiSettingsModal';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import AgentConsole from './AgentConsole';
import { LicenseEntitlements } from '@/features/license/license-policy';
import { toast } from 'sonner';

// 样式辅助函数
function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}

/**
 * 语音录制上滑取消的距离阈值（单位：像素）
 * 用户在按住说话时向上滑动超过此距离即视为取消发送
 */
const VOICE_CANCEL_SWIPE_THRESHOLD = 50;

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
                    className={`flex gap-3 w-full min-w-0 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                    {/* 头像 */}
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/20 ${msg.role === 'user' ? 'bg-[#334155] text-white' : 'bg-white text-[#1E293B]'
                            }`}
                        style={msg.role === 'user' ? { backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" } : {}}
                    >
                        {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    {/* 消息气泡：min-w-0 + max-w 双重约束防止溢出 */}
                    <div className={`flex-1 min-w-0 max-w-[85%] overflow-hidden rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm backdrop-blur-sm break-words [overflow-wrap:anywhere] ${msg.role === 'user'
                        ? 'bg-[#334155]/90 text-white rounded-tr-sm'
                        : 'bg-white/60 text-[#1E293B] border border-white/40 rounded-tl-sm'
                        }`}
                        style={msg.role === 'user' ? { backgroundImage: "linear-gradient(163.817deg, rgba(60, 60, 65, 0.9) 1.2863%, rgba(45, 45, 48, 0.9) 103.1%)" } : {}}
                    >
                        {msg.role === 'ai' ? (
                            <div className="prose prose-sm max-w-none overflow-hidden break-words [overflow-wrap:anywhere] prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-td:break-all prose-th:break-all prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:bg-gray-800/50 prose-pre:backdrop-blur prose-pre:text-gray-100 prose-code:break-all prose-code:whitespace-pre-wrap prose-code:text-blue-600 prose-code:bg-blue-50/50 prose-code:px-1 prose-code:rounded">
                                {/* 安全修复: rehypeSanitize 净化 AI 输出 */}
                                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{msg.content}</span>
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
    onSend: (textOverride?: string) => void;
    isLoading: boolean;
    onStopListening: () => void;
    // 语音识别相关属性
    isListening: boolean;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    transcript: string;
    interimTranscript: string;
    isSpeechSupported: boolean;
}

function ChatInput({
    inputValue, onChange, onSend, isLoading, onStopListening,
    isListening: _isListening, startListening, stopListening, resetTranscript,
    transcript, interimTranscript, isSpeechSupported
}: ChatInputProps) {
    const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
    const [isRecording, setIsRecording] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const prevTranscriptRef = useRef('');
    
    // 处理文本发送
    const handleSendText = (text: string) => {
        if (text.trim()) {
            onSend(text);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendText(inputValue);
        }
    };
    
    // 同步语音识别内容到输入框（仅追加新内容）
    useEffect(() => {
        if (inputMode === 'voice' && (transcript || interimTranscript)) {
            const currentFullText = transcript + interimTranscript;
            // 只追加新增的部分，避免覆盖用户编辑
            if (currentFullText.length > prevTranscriptRef.current.length) {
                const newPart = currentFullText.slice(prevTranscriptRef.current.length);
                onChange(inputValue + newPart);
                prevTranscriptRef.current = currentFullText;
            }
        }
    }, [transcript, interimTranscript, inputMode, onChange, inputValue]);
    
    // 开始录音：请求权限并启动语音识别
    const startRecording = async () => {
        if (!isSpeechSupported) {
            alert('您的浏览器不支持语音识别功能');
            return;
        }
        try {
            // 请求麦克风权限
            await navigator.mediaDevices.getUserMedia({ audio: true });
            resetTranscript();
            prevTranscriptRef.current = '';
            setIsRecording(true);
            setIsCanceling(false);
            // 启动语音识别
            startListening();
        } catch (error) {
            alert('请允许浏览器访问麦克风');
        }
    };

    // 停止录音：根据是否取消决定后续操作
    const stopRecording = (cancel: boolean) => {
        if (!isRecording) return;
        setIsRecording(false);
        stopListening();
        if (!cancel) {
            // 语音输入结束后发送消息
            const voiceText = (inputValue || `${transcript}${interimTranscript}`).trim();
            onSend(voiceText);
        } else {
            // 取消时清空输入并重置
            onChange('');
            resetTranscript();
            prevTranscriptRef.current = '';
            onStopListening();
        }
    };
    
    // 处理手势交互：按住说话 & 上滑取消
    const handlePointerDown = () => {
        startRecording();
    };
    
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isRecording) return;
        // 上滑超过阈值视为取消录制
        const targetRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (targetRect.top - e.clientY > VOICE_CANCEL_SWIPE_THRESHOLD) {
            setIsCanceling(true);
        } else {
            setIsCanceling(false);
        }
    };
    
    const handlePointerUp = () => {
        stopRecording(isCanceling);
    };
    
    // 切换输入模式时重置状态
    const handleModeSwitch = () => {
        if (isRecording) {
            stopRecording(true);
        }
        setInputMode(prev => prev === 'text' ? 'voice' : 'text');
    };

    return (
        <div className="p-3 bg-white border-t border-gray-100 shrink-0 flex flex-col relative w-full box-border">
            
            {/* 录音中的浮窗提示 & 动画 */}
            <AnimatePresence>
                {isRecording && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`absolute -top-14 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-2xl text-[13px] font-medium shadow-xl backdrop-blur-md flex items-center gap-2.5 transition-colors duration-200 z-50 ${isCanceling ? 'bg-red-500 text-white' : 'bg-[#334155] text-white'}`}
                    >
                        {isCanceling ? "松开手指，取消发送" : "正在聆听... 上滑取消"}
                        {!isCanceling && (
                            <div className="flex items-center gap-1.5 ml-1 h-3.5">
                                <span className="w-1 h-2/3 bg-white/90 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1 h-full bg-white/90 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1 h-1/2 bg-white/90 rounded-full animate-bounce" />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`w-full flex items-end gap-1.5 p-1.5 rounded-[24px] border shadow-sm transition-all duration-300 ${inputMode === 'voice' ? 'bg-gray-50/80 border-gray-200/50' : 'bg-white border-gray-200/80 focus-within:border-[#334155]/20 focus-within:shadow-[0_0_0_3px_rgba(51,65,85,0.08)]'}`}>
                {/* 左侧：语音/键盘 切换按钮 */}
                <button 
                    onClick={handleModeSwitch}
                    className="p-2 text-gray-500 hover:text-[#334155] hover:bg-gray-100 rounded-full transition-colors shrink-0 mb-0.5"
                    title={inputMode === 'text' ? "切换为语音" : "切换为键盘"}
                >
                    {inputMode === 'text' ? <Mic className="w-[22px] h-[22px]" /> : <Keyboard className="w-[22px] h-[22px]" />}
                </button>

                {/* 中间：主输入区域 */}
                <div className="flex-1 min-w-0 relative flex items-center min-h-[40px]">
                    {inputMode === 'text' ? (
                        <textarea
                            value={inputValue}
                            onChange={(e) => {
                                onChange(e.target.value);
                                // 自动撑开高度
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="输入消息..."
                            rows={1}
                            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none py-2.5 pl-1 pr-2 text-[14.5px] leading-relaxed text-[#1E293B] placeholder:text-gray-400 placeholder:font-light custom-scrollbar"
                            style={{ 
                                height: 'auto', 
                                minHeight: '40px',
                                maxHeight: '100px', // 大约 4 行
                            }}
                        />
                    ) : (
                        // “按住说话” 按钮
                        <div 
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            className={`w-full py-2.5 rounded-full text-center text-[14.5px] font-medium transition-all select-none touch-none ${
                                isRecording 
                                    ? (isCanceling ? 'bg-red-100 text-red-600' : 'bg-gray-300 text-[#1E293B]') 
                                    : 'bg-white shadow-sm border border-gray-200/80 text-[#1E293B] hover:bg-gray-50 cursor-pointer'
                            }`}
                        >
                            {isRecording ? (isCanceling ? '松开 取消' : '松开 发送') : '按住 说话'}
                        </div>
                    )}
                </div>

                {/* 右侧：发送按钮 (仅文本模式) */}
                {inputMode === 'text' && (
                    <div className="shrink-0 flex items-center mb-0.5 pr-0.5 min-w-[38px] justify-center relative h-[38px]">
                        <AnimatePresence mode="popLayout">
                            {inputValue.trim() && (
                                <motion.button
                                    key="send"
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSendText(inputValue)}
                                    aria-busy={isLoading}
                                    className="p-2 bg-[#334155] text-white rounded-full shadow-md hover:opacity-90 transition-all flex items-center justify-center"
                                    style={{ backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
                                >
                                    {isLoading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <ArrowUp className="w-[18px] h-[18px]" />}
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

// =====================================================================
// 主组件：AiChatWidget
// =====================================================================
interface AiChatWidgetProps {
    entities: HassEntities;
    callService?: AiCallService;
    isHaConnected?: boolean;
    haToken?: string;
    openSignal?: number;
    entitlements?: LicenseEntitlements;
    onOpenLicense?: () => void;
}

type ViewMode = 'floating' | 'sidebar' | 'minimized';

interface VoiceMenuProps {
    isTtsSupported: boolean;
    isSpeaking: boolean;
    isPaused: boolean;
    voices: SpeechSynthesisVoice[];
    selectedVoiceURI: string;
    rate: number;
    // 自动朗读开关（由用户控制）
    autoSpeakEnabled: boolean;
    onAutoSpeakChange: (enabled: boolean) => void;
    onVoiceChange: (voiceURI: string) => void;
    onRateChange: (rate: number) => void;
    onPause: () => void;
    onResume: () => void;
    onCancel: () => void;
}

function VoiceMenu({
    isTtsSupported,
    isSpeaking,
    isPaused,
    voices,
    selectedVoiceURI,
    rate,
    autoSpeakEnabled,
    onAutoSpeakChange,
    onVoiceChange,
    onRateChange,
    onPause,
    onResume,
    onCancel,
}: VoiceMenuProps) {
    const [open, setOpen] = useState(false);
    const availableVoices = voices || [];
    const zhVoices = availableVoices.filter(voice => voice.lang?.toLowerCase().startsWith('zh'));
    const visibleVoices = zhVoices.length > 0 ? zhVoices : availableVoices;

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="p-1.5 hover:bg-gray-100 hover:text-[#334155] rounded-full transition-colors"
                title="语音设置"
            >
                {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        className="absolute right-0 top-9 w-[260px] rounded-xl border border-gray-200 bg-white p-3 shadow-xl z-50 text-[#1E293B]"
                    >
                        {!isTtsSupported ? (
                            <div className="text-xs text-gray-500">当前浏览器不支持语音朗读</div>
                        ) : (
                            <div className="space-y-3">
                                {/* 自动朗读开关：控制 AI 回复是否自动播报 */}
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-gray-600">自动朗读 AI 回复</span>
                                    <button
                                        role="switch"
                                        aria-checked={autoSpeakEnabled}
                                        onClick={() => onAutoSpeakChange(!autoSpeakEnabled)}
                                        className={classNames(
                                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                                            autoSpeakEnabled ? "bg-[#334155]" : "bg-gray-300"
                                        )}
                                        title={autoSpeakEnabled ? '关闭自动朗读' : '开启自动朗读'}
                                    >
                                        <span
                                            className={classNames(
                                                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                                autoSpeakEnabled ? "translate-x-4" : "translate-x-0.5"
                                            )}
                                        />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-gray-600">AI 朗读</span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={isPaused ? onResume : onPause}
                                            disabled={!isSpeaking}
                                            className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                            title={isPaused ? '继续朗读' : '暂停朗读'}
                                        >
                                            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={onCancel}
                                            disabled={!isSpeaking && !isPaused}
                                            className="p-1.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                            title="停止朗读"
                                        >
                                            <VolumeX className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <label className="block space-y-1">
                                    <span className="text-[11px] text-gray-500">声音</span>
                                    <select
                                        value={selectedVoiceURI}
                                        onChange={(event) => onVoiceChange(event.target.value)}
                                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#334155]"
                                    >
                                        <option value="">自动选择中文声音</option>
                                        {visibleVoices.map(voice => (
                                            <option key={voice.voiceURI} value={voice.voiceURI}>
                                                {voice.name} ({voice.lang})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block space-y-1">
                                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                                        <span>语速</span>
                                        <span>{rate.toFixed(2)}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.6"
                                        max="1.4"
                                        step="0.05"
                                        value={rate}
                                        onChange={(event) => onRateChange(Number(event.target.value))}
                                        className="w-full accent-[#334155]"
                                    />
                                </label>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function AiChatWidget({
    entities,
    callService,
    isHaConnected = false,
    haToken,
    openSignal = 0,
    entitlements,
    onOpenLicense,
}: AiChatWidgetProps) {
    // UI 状态
    const [viewMode, setViewMode] = useState<ViewMode>('floating');
    const [isVisible, setIsVisible] = useState(false);
    const [view, setView] = useState<'chat' | 'settings' | 'agent'>('chat');
    const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
    const [confirmRequest, setConfirmRequest] = useState<AiActionConfirmRequest | null>(null);
    const isMobile = useIsMobile();
    const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

    useEffect(() => {
        if (openSignal > 0) {
            if (entitlements && !entitlements.canUseAi) {
                onOpenLicense?.();
                return;
            }
            setIsVisible(true);
            setView('chat');
            setViewMode('floating');
        }
    }, [openSignal, entitlements, onOpenLicense]);

    // TTS 朗读 Hook
    const {
        speak,
        cancel: cancelSpeak,
        pause: pauseSpeak,
        resume: resumeSpeak,
        isSpeaking,
        isPaused,
        isSupported: isTtsSupported,
        voices,
        selectedVoiceURI,
        setSelectedVoiceURI,
        rate: ttsRate,
        setRate: setTtsRate,
        autoSpeakEnabled,
        setAutoSpeakEnabled,
    } = useSpeechSynthesis();

    // 用 ref 保存最新开关状态，避免 handleAiReplyDone 因开关变化而重建
    const autoSpeakRef = useRef(autoSpeakEnabled);
    useEffect(() => {
        autoSpeakRef.current = autoSpeakEnabled;
    }, [autoSpeakEnabled]);

    // AI 回复完成后的处理：仅当用户开启自动朗读时才 TTS
    const handleAiReplyDone = useCallback((content: string) => {
        if (isTtsSupported && content && autoSpeakRef.current) {
            setVoiceStatus('speaking');
            speak(content, () => {
                setVoiceStatus('idle');
            });
        } else {
            // 未开启自动朗读时直接回到空闲状态
            setVoiceStatus('idle');
        }
    }, [isTtsSupported, speak]);

    const handleAiError = useCallback(() => {
        setVoiceStatus('idle');
    }, []);

    const handleConfirmAction = useCallback((request: AiActionConfirmRequest) => {
        setConfirmRequest(request);
        return new Promise<boolean>((resolve) => {
            confirmResolverRef.current = resolve;
        });
    }, []);

    const resolveConfirmAction = useCallback((value: boolean) => {
        confirmResolverRef.current?.(value);
        confirmResolverRef.current = null;
        setConfirmRequest(null);
    }, []);

    // AI 对话 Hook
    const {
        messages, inputValue, setInputValue, isLoading,
        config, sendMessage, handleSaveConfig, clearHistory
    } = useAiChat({
        entities,
        callService,
        isHaConnected,
        isVoiceMode: false,
        onAiReplyDone: handleAiReplyDone,
        onError: handleAiError,
        onConfirmAction: handleConfirmAction,
        onConfigSaveError: (message) => toast.warning(message),
    });

    // sendMessageRef 让 handleVoiceSpeechEnd 能调用最新的 sendMessage
    const sendMessageRef = useRef<((text: string) => void) | null>(null);

    // 语音输入结束后自动发送
    const handleVoiceSpeechEnd = useCallback((finalText: string) => {
        if (finalText.trim()) {
            setInputValue(finalText.trim());
            setVoiceStatus('thinking');
            setTimeout(() => sendMessageRef.current?.(finalText.trim()), 50);
        }
    }, [setInputValue]);

    // 语音识别 Hook（手动模式）
    const {
        isListening, transcript, interimTranscript,
        startListening, stopListening, resetTranscript,
        isSupported: isSpeechSupported
    } = useSpeechRecognition({
        onSpeechEnd: handleVoiceSpeechEnd,
        autoRestart: false,
    });

    // 注册 sendMessage 到 ref
    useEffect(() => {
        sendMessageRef.current = (text: string) => sendMessage(text);
    }, [sendMessage]);

    // 语音识别状态同步到语音状态指示器
    useEffect(() => {
        if (isListening && voiceStatus !== 'listening') {
            setVoiceStatus('listening');
        } else if (!isListening && !isLoading && voiceStatus === 'listening') {
            // 语音识别结束且不在加载中，转为思考状态
            if (inputValue.trim()) {
                setVoiceStatus('thinking');
            } else {
                setVoiceStatus('idle');
            }
        }
    }, [isListening, isLoading, voiceStatus, inputValue]);

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

    // 发送消息时停止语音
    const handleSend = useCallback((textOverride?: string) => {
        if (isListening) stopListening();
        if (isSpeaking) cancelSpeak();
        setVoiceStatus('thinking');
        sendMessage(textOverride);
    }, [isListening, isSpeaking, stopListening, cancelSpeak, sendMessage]);

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
    const modalClass = viewMode === 'sidebar'
        ? 'fixed top-0 right-0 h-full w-full md:w-[48%] lg:w-[38%] xl:w-[34%] rounded-none border-l border-gray-200'
        : 'fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-[380px] max-w-[380px] h-[650px] max-h-[80vh] rounded-[24px] shadow-2xl';

    // 未展开时显示触发按钮
    if (!isVisible) {
        return (
            <motion.button
                data-testid="ai-trigger-btn"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    if (entitlements && !entitlements.canUseAi) {
                        onOpenLicense?.();
                        return;
                    }
                    setIsVisible(true);
                }}
                className="fixed bottom-8 right-24 z-50 w-12 h-12 rounded-full flex items-center justify-center text-white cursor-pointer group"
            >
                {/* 1. 外围泛光扩散层 - 模拟流体呼吸感 */}
                <motion.div 
                    className="absolute inset-[-4px] rounded-full opacity-40 blur-[15px] pointer-events-none"
                    animate={{ 
                        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
                    style={{
                        backgroundImage: "linear-gradient(90deg, #c084fc, #60a5fa, #2dd4bf, #f472b6, #c084fc)",
                        backgroundSize: "200% 100%"
                    }}
                />
                
                {/* 2. 实体流光边框 - 与窗口渐变同步 */}
                <motion.div 
                    className="absolute inset-[0px] rounded-full opacity-100 pointer-events-none p-[1.5px] overflow-hidden"
                >
                    <motion.div 
                        className="w-full h-full rounded-full"
                        animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
                        transition={{ duration: 4, ease: "linear", repeat: Infinity }}
                        style={{
                            backgroundImage: "linear-gradient(90deg, #c084fc, #60a5fa, #2dd4bf, #f472b6, #c084fc)",
                            backgroundSize: "200% 100%"
                        }}
                    />
                </motion.div>
                
                {/* 3. 多重水波纹动力学效果 */}
                {[0, 1].map((index) => (
                    <motion.div 
                        key={index}
                        className="absolute inset-0 rounded-full border border-indigo-400/30 pointer-events-none"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: "easeOut",
                            delay: index * 1.5
                        }}
                    />
                ))}
                
                {/* 4. 按钮主体 - 极简深空黑屏效果 */}
                <div 
                    className="relative z-10 w-[calc(100%-3px)] h-[calc(100%-3px)] rounded-full flex items-center justify-center transition-all duration-500 !bg-[#0F172A]/90 backdrop-blur-2xl text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden"
                >
                    <Sparkles className="w-5 h-5 text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.8)] group-hover:scale-110 transition-transform duration-300" />
                    
                    {/* 内部微光扫过效果 */}
                    <motion.div 
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                        animate={{ translateX: ["100%", "-100%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
                    />
                </div>
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
                        transition={{ duration: viewMode === 'floating' ? 0.2 : 0.3 }}
                        drag={viewMode === 'floating'}
                        dragListener={false}
                        dragControls={dragControls}
                        dragMomentum={false}
                        dragElastic={0.1}
                        onDragEnd={handleDragEnd}
                        className={classNames(
                            "z-[100] flex flex-col origin-center",
                            modalClass
                        )}
                        style={viewMode === 'floating' ? { touchAction: "none" } : undefined}
                    >
                        {/* 流光泛光背景效应（广域模糊扩散层） */}
                        {viewMode === 'floating' && (
                            <motion.div 
                                className="absolute inset-[0px] -z-20 rounded-[inherit] opacity-80 blur-[15px] pointer-events-none"
                                animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
                                transition={{ duration: 7, ease: "linear", repeat: Infinity }}
                                style={{
                                    backgroundImage: "linear-gradient(90deg, #c084fc, #60a5fa, #2dd4bf, #f472b6, #c084fc)",
                                    backgroundSize: "200% 100%"
                                }}
                            />
                        )}
                        
                        {/* 实体流光边框层（扩张 1px 的超清边线） */}
                        {viewMode === 'floating' && (
                            <motion.div 
                                className="absolute inset-[-1.2px] -z-10 rounded-[21.2px] opacity-100 pointer-events-none"
                                animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
                                transition={{ duration: 7, ease: "linear", repeat: Infinity }}
                                style={{
                                    backgroundImage: "linear-gradient(90deg, #c084fc, #60a5fa, #2dd4bf, #f472b6, #c084fc)",
                                    backgroundSize: "200% 100%"
                                }}
                            />
                        )}

                        {/* 内部白色裁切实体容器 */}
                        <div className={classNames(
                            "flex flex-col flex-1 w-full h-full overflow-hidden bg-white z-10",
                            viewMode === 'floating' && "rounded-[20px]"
                        )}>
                            {view === 'chat' ? (
                            <>
                                {/* ===== 标题栏 / 拖拽把手 ===== */}
                                <div
                                    className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 cursor-grab active:cursor-grabbing select-none bg-white w-full box-border"
                                    onPointerDown={(e) => { if (viewMode === 'floating') dragControls.start(e); }}
                                >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                                <div className="w-8 h-8 rounded-full bg-[#334155] flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}>
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <h2 className="text-[15px] font-semibold text-[#1E293B] leading-tight flex items-center gap-1.5 truncate">
                                        AI 助手
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)] shrink-0" />
                                    </h2>
                                    <p className="text-[10px] text-gray-500 leading-tight truncate mt-0.5">{config.modelName}</p>
                                </div>
                            </div>

                            {/* 窗口控制按钮组 */}
                            <div className="flex items-center gap-0.5 sm:gap-1.5 text-gray-400 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                                {/* 侧边栏模式切换（仅桌面端） */}
                                {!isMobile && (
                                    <button
                                        onClick={() => setViewMode(prev => prev === 'sidebar' ? 'floating' : 'sidebar')}
                                        className="p-1.5 hover:bg-gray-100 hover:text-[#334155] rounded-full transition-colors"
                                        title="分屏视图"
                                    >
                                        {viewMode === 'sidebar' ? <PinOff className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
                                    </button>
                                )}

                                <button onClick={() => setView('settings')} className="p-1.5 hover:bg-gray-100 hover:text-[#334155] rounded-full transition-colors" title="模型配置">
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (entitlements && !entitlements.canUseAgent) {
                                            onOpenLicense?.();
                                            return;
                                        }
                                        setView('agent');
                                    }}
                                    className="p-1.5 hover:bg-gray-100 hover:text-[#334155] rounded-full transition-colors"
                                    title="Agent 控制台"
                                >
                                    <BrainCircuit className="w-4 h-4" />
                                </button>
                                <VoiceMenu
                                    isTtsSupported={isTtsSupported}
                                    isSpeaking={isSpeaking}
                                    isPaused={isPaused}
                                    voices={voices}
                                    selectedVoiceURI={selectedVoiceURI}
                                    rate={ttsRate}
                                    autoSpeakEnabled={autoSpeakEnabled}
                                    onAutoSpeakChange={(enabled) => {
                                        setAutoSpeakEnabled(enabled);
                                        // 关闭开关时立即停止当前朗读
                                        if (!enabled) {
                                            cancelSpeak();
                                            setVoiceStatus('idle');
                                        }
                                    }}
                                    onVoiceChange={setSelectedVoiceURI}
                                    onRateChange={setTtsRate}
                                    onPause={pauseSpeak}
                                    onResume={resumeSpeak}
                                    onCancel={() => {
                                        cancelSpeak();
                                        setVoiceStatus('idle');
                                    }}
                                />
                                <button onClick={clearHistory} className="p-1.5 hover:bg-gray-100 hover:text-[#334155] rounded-full transition-colors" title="清空对话">
                                    <Eraser className="w-4 h-4" />
                                </button>
                                <div className="w-px h-3 bg-gray-200 mx-0.5" />
                                <button onClick={() => setIsVisible(false)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* ===== 消息区域 ===== */}
                        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 space-y-5 custom-scrollbar bg-[#F8FAFC]">
                            <ChatMessageList messages={messages} isLoading={isLoading} />

                            {/* 语音对话模式状态提示 */}
                            {voiceStatus !== 'idle' && (
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
                            onStopListening={stopListening}
                            isListening={isListening}
                            startListening={startListening}
                            stopListening={stopListening}
                            resetTranscript={resetTranscript}
                            transcript={transcript}
                            interimTranscript={interimTranscript}
                            isSpeechSupported={isSpeechSupported}
                        />
                            </>
                        ) : view === 'settings' ? (
                            <AiSettingsModal
                                onClose={() => setView('chat')}
                                onSave={async (cfg) => {
                                    await handleSaveConfig(cfg);
                                    setView('chat');
                                }}
                                initialConfig={config}
                                onDragStart={(e) => { if (viewMode === 'floating') dragControls.start(e); }}
                            />
                        ) : (
                            <AgentConsole
                                onClose={() => setView('chat')}
                                onDragStart={(e) => { if (viewMode === 'floating') dragControls.start(e); }}
                                haToken={haToken}
                            />
                        )}
                        </div>

                        {confirmRequest && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
                                <div className="w-full max-w-[320px] rounded-[20px] bg-white p-5 shadow-2xl">
                                    <h3 className="text-[16px] font-semibold text-[#040415]">{confirmRequest.title}</h3>
                                    <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{confirmRequest.description}</p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {confirmRequest.targetNames.map((name) => (
                                            <span key={name} className="rounded-full bg-gray-100 px-3 py-1 text-[12px] font-medium text-[#334155]">{name}</span>
                                        ))}
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => resolveConfirmAction(false)}
                                            className="rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-[13px] font-semibold text-gray-500 transition-colors hover:bg-gray-50"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => resolveConfirmAction(true)}
                                            className="rounded-[14px] bg-[#040415] px-4 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                                        >
                                            确认执行
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
