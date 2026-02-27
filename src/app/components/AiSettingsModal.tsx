import { useState, useEffect } from 'react';
import { X, Save, Bot, Key, Globe, Cpu, Loader2, Check, ChevronDown } from 'lucide-react';
import { AiConfig, DEFAULT_CONFIG, AI_PROVIDERS, AiProviderType, AiConfigSchema } from '@/services/ai-service';

interface AiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: AiConfig) => void;
    initialConfig?: AiConfig;
}

export default function AiSettingsModal({ isOpen, onClose, onSave, initialConfig }: AiSettingsModalProps) {
    const [config, setConfig] = useState<AiConfig>(initialConfig || DEFAULT_CONFIG);
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (isOpen && initialConfig) {
            setConfig(initialConfig);
        }
    }, [isOpen, initialConfig]);

    const handleProviderChange = (providerKey: AiProviderType) => {
        const providerConfig = AI_PROVIDERS[providerKey];
        setConfig({
            ...config,
            provider: providerKey,
            baseUrl: providerConfig.baseUrl,
            modelName: providerConfig.defaultModel,
            apiKey: '' // Clear API key when switching providers for security/clarity
        });
    };

    const handleSave = async () => {
        // 安全修复: 保存前用 Zod Schema 验证配置，防止非法格式内容写入存储
        const result = AiConfigSchema.safeParse(config);
        if (!result.success) {
            // 对用户显示简洁错误提示，不暴露验证栈
            const firstError = result.error.errors[0]?.message || '配置格式不正确，请检查输入';
            alert(firstError); // 简单 alert ，不引入驱动依赖
            return;
        }
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        onSave(result.data as AiConfig);
        setIsSaving(false);
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
            onClose();
        }, 1000);
    };

    if (!isOpen) return null;

    // Safe fallback if provider in config is invalid
    const providerKey = (config.provider && AI_PROVIDERS[config.provider]) ? config.provider : 'siliconflow';
    const currentProvider = AI_PROVIDERS[providerKey];
    const hasPredefinedModels = currentProvider.models && currentProvider.models.length > 0;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[20px] w-full max-w-[320px] h-[580px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#334155] flex items-center justify-center text-white shadow-sm" style={{ backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}>
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-semibold text-[#1E293B] leading-tight">AI 管家配置</h2>
                            <p className="text-[10px] text-gray-500 leading-tight">智能助手设置</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors -mr-1">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                    {/* Provider Selection */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[#1E293B] block">模型服务商</label>
                        <div className="grid grid-cols-1 gap-2">
                            {(Object.keys(AI_PROVIDERS) as AiProviderType[]).map((key) => (
                                <button
                                    key={key}
                                    onClick={() => handleProviderChange(key)}
                                    className={`py-2.5 px-3 rounded-xl border flex items-center justify-between gap-2 transition-all text-left ${config.provider === key
                                            ? 'border-[#334155] bg-[#334155] text-white ring-1 ring-[#334155] shadow-sm'
                                            : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                        }`}
                                    style={config.provider === key ? { backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" } : {}}
                                >
                                    <span className="font-medium text-[13px]">{AI_PROVIDERS[key].label}</span>
                                    {config.provider === key && <Check className="w-3.5 h-3.5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[#1E293B] flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5" />
                            API Key <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? "text" : "password"}
                                value={config.apiKey}
                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                placeholder={`sk-...`}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#334155] focus:ring-1 focus:ring-[#334155] outline-none transition-all pr-14 font-mono text-[13px] text-[#1E293B]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600 px-1 py-0.5"
                            >
                                {showKey ? '隐藏' : '显示'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-tight break-all">
                            {config.provider === 'siliconflow' && (
                                <span>
                                    还没有 Key? <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">去硅基流动官网申请 &rarr;</a>
                                </span>
                            )}
                            {config.provider === 'alibaba' && (
                                <span>
                                    还没有 Key? <a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">去阿里云百炼申请 &rarr;</a>
                                </span>
                            )}
                            {config.provider === 'custom' && '请输入您的 OpenAI 格式 API Key'}
                        </p>
                    </div>

                    {/* Model Name Selection (Combobox) */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[#1E293B] flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5" />
                            模型选择
                        </label>
                        <div className="relative">
                            <input
                                list="model-presets"
                                type="text"
                                value={config.modelName}
                                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                                placeholder="输入或选择模型..."
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#334155] focus:ring-1 focus:ring-[#334155] outline-none transition-all text-[13px] font-mono text-[#1E293B] pr-8"
                            />
                            {hasPredefinedModels && (
                                <>
                                    <datalist id="model-presets">
                                        {currentProvider.models.map((model) => (
                                            <option key={model.value} value={model.value}>{model.label}</option>
                                        ))}
                                    </datalist>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                </>
                            )}
                        </div>
                        {hasPredefinedModels && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {currentProvider.models.slice(0, 2).map(m => (
                                    <button
                                        key={m.value}
                                        onClick={() => setConfig({ ...config, modelName: m.value })}
                                        className="text-[10px] px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md border border-gray-100 transition-colors truncate max-w-full"
                                    >
                                        {m.label.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Base URL */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[#1E293B] flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5" />
                            Base URL {config.provider !== 'custom' && <span className="text-[10px] font-normal text-gray-400 ml-0.5">(自动填充)</span>}
                        </label>
                        <input
                            type="text"
                            value={config.baseUrl || ''}
                            onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                            placeholder="https://api.example.com/v1"
                            disabled={config.provider !== 'custom'}
                            className={`w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-[#334155] focus:ring-1 focus:ring-[#334155] outline-none transition-all text-[13px] text-[#1E293B] ${config.provider !== 'custom' ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 bg-[#F8FAFC] shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full text-white py-2.5 rounded-xl font-medium text-[14px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed ${isSaved ? 'bg-green-500 hover:bg-green-600' : 'hover:opacity-90'
                            }`}
                        style={!isSaved ? { backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" } : {}}
                    >
                        {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isSaved ? (
                            <Check className="w-3.5 h-3.5" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )}
                        {isSaving ? '保存中...' : isSaved ? '已保存' : '保存配置'}
                    </button>
                </div>
            </div>
        </div>
    );
}
