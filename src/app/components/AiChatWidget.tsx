import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
// 安全修复 #1: 引入 rehype-sanitize，过滤 AI 返回内容中的恶意 HTML/脚本
import rehypeSanitize from 'rehype-sanitize';
import {
    Bot, Send, X, Settings, Loader2, Sparkles, User as UserIcon,
    Eraser, PanelRight, PinOff
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useDragControls, Variants } from 'motion/react';
import { aiService, AiConfig, DEFAULT_CONFIG, AiConfigSchema } from '@/services/ai-service';
import { getSmartHomeContext } from '@/utils/ai-context';
import { HassEntities } from 'home-assistant-js-websocket';
import AiSettingsModal from './AiSettingsModal';
import { useIsMobile } from '@/app/components/ui/use-mobile';

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
    callService: (domain: string, service: string, serviceData?: any) => Promise<void>;
}

type ViewMode = 'floating' | 'sidebar' | 'minimized';

export default function AiChatWidget({ entities, callService }: AiChatWidgetProps) {
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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // 安全修复 #2: 加载配置时用 Zod Schema 验证，防止 localStorage 被篡改导致注入
    useEffect(() => {
        const savedConfig = localStorage.getItem('ai_config');
        if (savedConfig) {
            try {
                const raw = JSON.parse(savedConfig);
                // 严格校验结构和字段格式，验证失败则丢弃并使用默认配置
                const result = AiConfigSchema.safeParse(raw);
                if (result.success) {
                    setConfig(result.data as AiConfig);
                    aiService.updateConfig(result.data as AiConfig);
                } else {
                    // 仅在开发模式记录校验详情，生产不暴露
                    if (import.meta.env.DEV) {
                        console.warn('[AiChat] 配置校验失败，已重置为默认:', result.error.flatten());
                    }
                    // 校验失败：重置为默认配置并清除非法存储数据
                    localStorage.removeItem('ai_config');
                }
            } catch {
                // JSON 解析失败：清除损坏的数据
                localStorage.removeItem('ai_config');
            }
        }
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
                    // If in sidebar or floating, minimize first, or close if focused?
                    // Let's just hide/minimize
                    setIsVisible(false);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, viewMode]);

    // Logic
    const handleSaveConfig = (newConfig: AiConfig) => {
        setConfig(newConfig);
        aiService.updateConfig(newConfig);
        localStorage.setItem('ai_config', JSON.stringify(newConfig));
        setIsSettingsOpen(false);
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

        try {
            const contextData = getSmartHomeContext(entities);
            const responseText = await aiService.chat(userMsg.content, contextData);

            // 安全修复 #3: AI 动作执行白名单
            // 只允许对物理设备的基础控制，禁止 script/automation/system 等高危域
            const ALLOWED_DOMAINS = new Set([
                'light', 'switch', 'cover', 'fan', 'media_player',
                'climate', 'lock', 'scene', 'input_boolean'
            ]);
            // 只允许标准的 HA 服务调用操作
            const ALLOWED_SERVICES = new Set([
                'turn_on', 'turn_off', 'toggle', 'set_temperature',
                'open_cover', 'close_cover', 'stop_cover',
                'volume_set', 'media_play', 'media_pause', 'media_stop',
                'set_fan_mode', 'set_hvac_mode', 'activate'
            ]);

            const actionRegex = /```json\s*(\{[\s\S]*?"action":\s*"call_service"[\s\S]*?\})\s*```/;
            const match = responseText.match(actionRegex);
            let executionMsg: Message | null = null;

            if (match) {
                try {
                    const actionData = JSON.parse(match[1]);
                    if (actionData.action === 'call_service') {
                        const domain = String(actionData.domain || '');
                        const service = String(actionData.service || '');

                        // 白名单校验：不在允许列表内的 domain/service 直接拒绝
                        if (!ALLOWED_DOMAINS.has(domain) || !ALLOWED_SERVICES.has(service)) {
                            if (import.meta.env.DEV) {
                                console.warn(`[AiChat] 拒绝执行高危指令: ${domain}.${service}`);
                            }
                            executionMsg = {
                                id: (Date.now() + 2).toString(),
                                role: 'ai',
                                content: `⛔ **操作被拦截**: 指令 \`${domain}.${service}\` 不在允许范围内`,
                                timestamp: Date.now()
                            };
                        } else {
                            if (import.meta.env.DEV) {
                                console.log('[AiChat] 执行已验证的 AI 动作:', domain, service);
                            }
                            await callService(domain, service, actionData.service_data);
                            executionMsg = {
                                id: (Date.now() + 2).toString(),
                                role: 'ai',
                                content: `⚡️ **已执行操作**: ${actionData.summary || '指令已发送'}`,
                                timestamp: Date.now()
                            };
                        }
                    }
                } catch (e) {
                    // 安全修复: 执行失败只暴露友好提示，不暴露内部错误栈
                    if (import.meta.env.DEV) {
                        console.error('[AiChat] AI action 执行失败:', e);
                    }
                    executionMsg = {
                        id: (Date.now() + 2).toString(),
                        role: 'ai',
                        content: `⚠️ **操作执行失败**: ${(e as Error).message}`,
                        timestamp: Date.now()
                    };
                }
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: responseText,
                timestamp: Date.now()
            };

            setMessages(prev => {
                const newMsgs = [...prev, aiMsg];
                if (executionMsg) newMsgs.push(executionMsg);
                return newMsgs;
            });
        } catch (error: any) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: `❌ 出错了: ${error.message || '请检查网络或 API Key 配置'}`,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
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
                            <div className="relative flex items-end gap-2 bg-white/60 p-1.5 rounded-[20px] border border-white/50 focus-within:border-[#334155]/50 focus-within:ring-1 focus-within:ring-[#334155]/20 transition-all shadow-sm">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="输入指令..."
                                    className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-24 min-h-[44px] py-2.5 px-3 text-sm text-[#1E293B] placeholder:text-gray-500/70"
                                    rows={1}
                                    style={{ height: 'auto', minHeight: '44px' }}
                                />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isLoading}
                                    className="p-2.5 text-white rounded-[16px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-0.5 shadow-md"
                                    style={{ backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </motion.button>
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
