/**
 * 摄像头配置管理面板（嵌入式）
 * 用于 SettingsModal cameras tab，支持：
 *   RTSP | ONVIF | Home Assistant | 萤石云(Ezviz) | Aqara(绿米)
 */
import { useState, useEffect } from 'react';
import {
    Eye, EyeOff, Plus, Trash2, Video, Save, ChevronRight,
    ArrowLeft, CheckCircle2, Info, Wifi, Cloud, Home, Radio, Camera, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import type { CameraConfig, CameraSourceType, AqaraConfig } from '@/types/camera';
import {
    loadCameraConfigs,
    saveCameraConfigs,
    deleteCameraConfig,
} from '@/utils/camera-storage';

// ─────────────────────────────────────────────────────────────────
// ⚠️  子组件必须定义在模块顶层，不能放在父组件函数内部。
//    放在函数内会导致每次父组件渲染时生成新的组件引用，
//    React 会将其视为不同组件而触发卸载/挂载，从而使 input 失去焦点。
// ─────────────────────────────────────────────────────────────────

/** 通用文本输入框 */
function Input({
    value,
    onChange,
    placeholder,
    type = 'text',
    className = '',
    disabled = false,
}: {
    value: string | number;
    onChange: (v: string) => void;
    placeholder: string;
    type?: string;
    className?: string;
    disabled?: boolean;
}) {
    return (
        <input
            type={type}
            className={`w-full text-[12px] px-3 py-2 rounded-lg bg-background border border-border/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            disabled={disabled}
        />
    );
}

/** 密码输入框（带眼睛图标切换），内部自管理可见状态，不依赖父组件 */
function PwdInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    // 每个 PwdInput 自己管理可见性，避免父组件 state 变更触发重渲染
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <input
                type={visible ? 'text' : 'password'}
                className="w-full text-[12px] px-3 py-2 pr-9 rounded-lg bg-background border border-border/40 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete="new-password"
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
            >
                {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
        </div>
    );
}

/** 表单标签 */
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="text-[11px] text-muted-foreground mb-1 block font-medium">
            {children}
            {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
    );
}

interface CameraConfigPanelProps {
    /** 配置变更回调，通知父组件刷新摄像头视图 */
    onConfigChange?: (configs: CameraConfig[]) => void;
}

/** 接入方式元数据 */
const SOURCE_OPTIONS: {
    value: CameraSourceType;
    label: string;
    desc: string;
    icon: React.ComponentType<any>;
    color: string;
}[] = [
        {
            value: 'rtsp',
            label: 'RTSP 流',
            desc: '直接输入 RTSP 地址，适合各品牌 IP 摄像机',
            icon: Radio,
            color: '#3b82f6',
        },
        {
            value: 'onvif',
            label: 'ONVIF',
            desc: '通过 ONVIF 协议发现视频流，万能兼容方案',
            icon: Wifi,
            color: '#8b5cf6',
        },
        {
            value: 'hass',
            label: 'Home Assistant',
            desc: '直连 HA 中的 camera 实体，零配置即用',
            icon: Home,
            color: '#10b981',
        },
        {
            value: 'ezviz',
            label: '萤石云',
            desc: '萤石开放平台 AppKey 接入，海康系列推荐',
            icon: Cloud,
            color: '#f59e0b',
        },
        {
            value: 'aqara',
            label: 'Aqara 绿米',
            desc: 'Aqara Home 开放平台或局域网直连',
            icon: Camera,
            color: '#ec4899',
        },
    ];

/** 生成唯一 ID */
const genId = () => `cam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/** 创建各类型的空白配置默认值 */
function createDefaultConfig(type: CameraSourceType): Partial<CameraConfig> {
    switch (type) {
        case 'rtsp':
            return { rtsp: { streamUrl: '' } };
        case 'onvif':
            // ONVIF 默认端口 80，go2rtc 代理配置留空提示填写
            return { onvif: { host: '', port: 80, username: '', password: '' } };
        case 'hass':
            // HA 默认使用 snapshot（MJPEG）最兼容
            return { hass: { entityId: '', streamMode: 'snapshot' } };
        case 'ezviz':
            // 萤石云默认协议 2=HLS
            return { ezviz: { appKey: '', appSecret: '', deviceSerial: '', channelNo: 1, protocol: 2 } };
        case 'aqara':
            return { aqara: { mode: 'cloud', deviceType: 'Camera', appId: '', appKey: '', accessToken: '', deviceDid: '', streamType: 'main' } };
        default:
            return {};
    }
}

export default function CameraConfigPanel({ onConfigChange }: CameraConfigPanelProps) {
    // 已保存的配置列表
    const [configs, setConfigs] = useState<CameraConfig[]>([]);
    // 当前编辑的配置（null = 列表视图）
    const [editing, setEditing] = useState<CameraConfig | null>(null);
    // 保存中状态
    const [saving, setSaving] = useState(false);
    // 保存成功提示
    const [saved, setSaved] = useState(false);
    // 详情页：删除二次确认状态
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    // 列表页：正在准备删除的摄像头 ID（内联确认）
    const [listDeleteId, setListDeleteId] = useState<string | null>(null);

    // 初始加载配置
    useEffect(() => {
        setConfigs(loadCameraConfigs());
    }, []);

    /** 公共：刷新并通知 */
    const refreshList = (updated: CameraConfig[]) => {
        setConfigs(updated);
        onConfigChange?.(updated);
        // 发送全局事件，通知其他组件（如 CameraView）刷新
        window.dispatchEvent(new CustomEvent('camera-config-changed'));
    };

    /** 新建空白配置 */
    const handleNew = () => {
        const base = createDefaultConfig('rtsp');
        setEditing({
            id: genId(),
            name: '',
            sourceType: 'rtsp',
            enabled: true,
            createdAt: Date.now(),
            ...base,
        });
    };

    /** 编辑已有配置 */
    const handleEdit = (c: CameraConfig) => {
        setEditing({ ...c });
        setSaved(false);
        setDeleteConfirm(false);
    };

    /** 执行真正的删除（无弹窗，用内联确认替代） */
    const handleDelete = (id: string, name: string) => {
        const updated = deleteCameraConfig(id);
        refreshList(updated);
        toast.success(`摄像头「${name}」已删除`);
        setDeleteConfirm(false);
        setListDeleteId(null);
        setEditing(null);
    };

    /** 切换接入方式，重置对应子配置 */
    const handleSourceChange = (type: CameraSourceType) => {
        if (!editing) return;
        const cleared = { ...editing, sourceType: type };
        // 清除所有子配置
        delete cleared.rtsp;
        delete cleared.onvif;
        delete cleared.hass;
        delete cleared.ezviz;
        delete cleared.aqara;
        // 初始化新类型子配置
        const defaults = createDefaultConfig(type);
        setEditing({ ...cleared, ...defaults });
    };

    /** 更新嵌套字段 */
    const updateField = (section: string, field: string, value: any) => {
        if (!editing) return;
        setEditing({
            ...editing,
            [section]: {
                ...(editing as any)[section],
                [field]: value,
            },
        });
    };

    /** 切换 Aqara 模式 */
    const handleAqaraMode = (mode: AqaraConfig['mode']) => {
        if (!editing) return;
        setEditing({
            ...editing,
            aqara: {
                mode,
                deviceType: 'Camera',
                streamType: editing.aqara?.streamType || 'main',
            },
        });
    };

    const validateEditing = (cfg: CameraConfig): string | null => {
        if (!cfg.name.trim()) return '请填写摄像头名称';
        switch (cfg.sourceType) {
            case 'rtsp': {
                const url = cfg.rtsp?.streamUrl?.trim();
                if (!url) return '请填写 RTSP/HTTP 流地址';
                // rtsp:// 协议必须配置 go2rtc
                if ((url.startsWith('rtsp://') || url.startsWith('rtsps://')) && !cfg.rtsp?.go2rtc?.apiUrl?.trim()) {
                    return '原生 RTSP 需填写 go2rtc API 地址';
                }
                if ((url.startsWith('rtsp://') || url.startsWith('rtsps://')) && !cfg.rtsp?.go2rtc?.streamName?.trim()) {
                    return '原生 RTSP 需填写 go2rtc 流名称';
                }
                return null;
            }
            case 'onvif': {
                if (!cfg.onvif?.host?.trim()) return '请填写 ONVIF 设备 IP 地址';
                if (!cfg.onvif?.username?.trim()) return '请填写 ONVIF 用户名';
                if (!cfg.onvif?.password?.trim()) return '请填写 ONVIF 密码';
                if (!cfg.onvif?.go2rtc?.apiUrl?.trim()) return '请填写 go2rtc API 地址';
                if (!cfg.onvif?.go2rtc?.streamName?.trim()) return '请填写 go2rtc 中的流名称';
                return null;
            }
            case 'hass': {
                if (!cfg.hass?.entityId?.trim()) return '请填写 Home Assistant 摄像头实体 ID';
                return null;
            }
            case 'ezviz': {
                if (!cfg.ezviz?.appKey?.trim()) return '请填写萤石云 AppKey';
                if (!cfg.ezviz?.appSecret?.trim()) return '请填写萤石云 AppSecret';
                if (!cfg.ezviz?.deviceSerial?.trim()) return '请填写萤石云设备序列号';
                return null;
            }
            case 'aqara': {
                const mode = cfg.aqara?.mode || 'cloud';
                const deviceType = cfg.aqara?.deviceType || 'Camera';
                if (deviceType !== 'Camera') return 'Aqara 摄像头设备类型必须为 Camera';
                if (mode === 'cloud') {
                    if (!cfg.aqara?.appId?.trim()) return '请填写 Aqara AppId';
                    if (!cfg.aqara?.appKey?.trim()) return '请填写 Aqara AppKey';
                    if (!cfg.aqara?.accessToken?.trim()) return '请填写 Aqara AccessToken';
                    if (!cfg.aqara?.deviceDid?.trim()) return '请填写 Aqara 设备 DID/subject_id';
                    return null;
                }
                if (!cfg.aqara?.host?.trim()) return '请填写 Aqara 设备 IP 地址';
                return null;
            }
            default:
                return null;
        }
    };

    /** 保存配置 */
    const handleSave = () => {
        if (!editing) return;
        // 校验必填字段
        const err = validateEditing(editing);
        if (err) {
            toast.error(err);
            return;
        }
        setSaving(true);
        setTimeout(() => {
            const idx = configs.findIndex((c) => c.id === editing.id);
            let updated: CameraConfig[];
            if (idx >= 0) {
                // 更新已有配置
                updated = configs.map((c) => (c.id === editing.id ? editing : c));
            } else {
                // 新增配置
                updated = [...configs, editing];
            }
            // 持久化
            saveCameraConfigs(updated);
            refreshList(updated);
            const name = editing.name;
            setEditing(null);
            setSaving(false);
            setSaved(true);
            // 显示成功 toast，比绿色 banner 更明显
            toast.success(`摄像头「${name}」配置已保存`);
            setTimeout(() => setSaved(false), 2500);
        }, 150);
    };


    // ── Input / PwdInput / Label 已提取到模块顶层，此处已删除内联定义 ──

    // ──────────── 各接入方式表单 ────────────
    const renderForm = () => {
        if (!editing) return null;

        switch (editing.sourceType) {
            case 'rtsp': {
                const rtspUrl = editing.rtsp?.streamUrl?.trim() || '';
                const isNativeRtsp = rtspUrl.startsWith('rtsp://') || rtspUrl.startsWith('rtsps://');
                return (
                    <div className="space-y-3">
                        <div>
                            <Label required>流地址</Label>
                            <Input
                                value={editing.rtsp?.streamUrl || ''}
                                onChange={(v) => updateField('rtsp', 'streamUrl', v)}
                                placeholder="rtsp://admin:pass@192.168.1.100:554/stream1"
                            />
                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                                支持：rtsp:// · rtsps:// · http://（MJPEG/HLS/FLV）
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label>用户名（可选）</Label>
                                <Input
                                    value={editing.rtsp?.username || ''}
                                    onChange={(v) => updateField('rtsp', 'username', v)}
                                    placeholder="admin"
                                />
                            </div>
                            <div>
                                <Label>密码（可选）</Label>
                                <PwdInput
                                    value={editing.rtsp?.password || ''}
                                    onChange={(v) => updateField('rtsp', 'password', v)}
                                    placeholder="可选，也可内嵌在 URL 中"
                                />
                            </div>
                        </div>

                        {/* go2rtc 代理配置：仅在原生 RTSP 时显示 */}
                        {isNativeRtsp && (
                            <div className="space-y-3 pt-1 border-t border-border/20">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span className="text-[11px] font-semibold text-foreground">go2rtc 代理配置</span>
                                    <a href="https://github.com/AlexxIT/go2rtc" target="_blank" rel="noopener noreferrer"
                                        className="ml-auto text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
                                        <ExternalLink className="w-2.5 h-2.5" />什么是 go2rtc?
                                    </a>
                                </div>
                                <div className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/40 rounded-lg px-3 py-2">
                                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>浏览器无法直接播放 RTSP，请先在 go2rtc 中添加此摄像头，再填写以下代理信息。HA 用户可安装「go2rtc」Add-on。</span>
                                </div>
                                <div>
                                    <Label required>go2rtc API 地址</Label>
                                    <Input
                                        value={(editing.rtsp?.go2rtc as any)?.apiUrl || ''}
                                        onChange={(v) => setEditing({
                                            ...editing,
                                            rtsp: { ...editing.rtsp!, go2rtc: { ...(editing.rtsp?.go2rtc || { streamName: '' }), apiUrl: v } }
                                        })}
                                        placeholder="http://192.168.1.100:1984  或  /go2rtc"
                                    />
                                    <p className="text-[10px] text-muted-foreground/50 mt-1">go2rtc Web界面默认端口 1984</p>
                                </div>
                                <div>
                                    <Label required>go2rtc 流名称</Label>
                                    <Input
                                        value={(editing.rtsp?.go2rtc as any)?.streamName || ''}
                                        onChange={(v) => setEditing({
                                            ...editing,
                                            rtsp: { ...editing.rtsp!, go2rtc: { ...(editing.rtsp?.go2rtc || { apiUrl: '' }), streamName: v } }
                                        })}
                                        placeholder="front_door（go2rtc 配置中的 stream 名）"
                                    />
                                </div>
                                <div>
                                    <Label>播放协议</Label>
                                    <div className="flex gap-1.5">
                                        {(['webrtc', 'hls', 'flv'] as const).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setEditing({
                                                    ...editing,
                                                    rtsp: { ...editing.rtsp!, go2rtc: { ...(editing.rtsp?.go2rtc || { apiUrl: '', streamName: '' }), preferredProtocol: p } }
                                                })}
                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${((editing.rtsp?.go2rtc as any)?.preferredProtocol || 'webrtc') === p
                                                        ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300'
                                                        : 'border-border/30 text-muted-foreground hover:bg-accent/50'
                                                    }`}
                                            >
                                                {p === 'webrtc' ? '⚡ WebRTC' : p === 'hls' ? '📺 HLS' : '📡 FLV'}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/50 mt-1">WebRTC 延迟最低（&lt;200ms），HLS 兼容性最好</p>
                                </div>
                            </div>
                        )}

                        {/* http:// 地址提示（可直接播放）*/}
                        {rtspUrl.startsWith('http') && (
                            <div className="flex items-start gap-2 text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200/40 rounded-lg px-3 py-2">
                                <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>HTTP 流可直接在浏览器播放，无需 go2rtc 代理。支持 MJPEG、HLS(.m3u8)、FLV(.flv) 格式。</span>
                            </div>
                        )}
                    </div>
                );
            }

            case 'onvif':
                return (
                    <div className="space-y-3">
                        {/* ONVIF 设备信息 */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <Label required>设备 IP 地址</Label>
                                <Input
                                    value={editing.onvif?.host || ''}
                                    onChange={(v) => updateField('onvif', 'host', v)}
                                    placeholder="192.168.1.100"
                                />
                            </div>
                            <div>
                                <Label>ONVIF 端口</Label>
                                <Input
                                    value={editing.onvif?.port || 80}
                                    onChange={(v) => updateField('onvif', 'port', parseInt(v) || 80)}
                                    placeholder="80"
                                    type="number"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label required>用户名</Label>
                                <Input
                                    value={editing.onvif?.username || ''}
                                    onChange={(v) => updateField('onvif', 'username', v)}
                                    placeholder="admin"
                                />
                            </div>
                            <div>
                                <Label required>密码</Label>
                                <PwdInput
                                    value={editing.onvif?.password || ''}
                                    onChange={(v) => updateField('onvif', 'password', v)}
                                    placeholder="密码"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Profile Token（可选）</Label>
                            <Input
                                value={editing.onvif?.profileToken || ''}
                                onChange={(v) => updateField('onvif', 'profileToken', v)}
                                placeholder="留空自动使用默认 Profile"
                            />
                        </div>

                        {/* go2rtc 代理配置（ONVIF 必须）*/}
                        <div className="space-y-3 pt-1 border-t border-border/20">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                <span className="text-[11px] font-semibold text-foreground">go2rtc 代理配置（必填）</span>
                                <a href="https://github.com/AlexxIT/go2rtc#onvif" target="_blank" rel="noopener noreferrer"
                                    className="ml-auto text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
                                    <ExternalLink className="w-2.5 h-2.5" />配置指南
                                </a>
                            </div>
                            <div className="flex items-start gap-2 text-[10px] text-muted-foreground/70 bg-accent/30 rounded-lg px-3 py-2">
                                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                                <span>ONVIF 需通过 go2rtc 转码才能在浏览器播放。go2rtc 原生支持 ONVIF 协议，在其配置文件中添加流后填入以下信息。</span>
                            </div>
                            <div>
                                <Label required>go2rtc API 地址</Label>
                                <Input
                                    value={(editing.onvif?.go2rtc as any)?.apiUrl || ''}
                                    onChange={(v) => setEditing({
                                        ...editing,
                                        onvif: { ...editing.onvif!, go2rtc: { ...(editing.onvif?.go2rtc || { streamName: '' }), apiUrl: v } }
                                    })}
                                    placeholder="http://192.168.1.100:1984"
                                />
                            </div>
                            <div>
                                <Label required>go2rtc 流名称</Label>
                                <Input
                                    value={(editing.onvif?.go2rtc as any)?.streamName || ''}
                                    onChange={(v) => setEditing({
                                        ...editing,
                                        onvif: { ...editing.onvif!, go2rtc: { ...(editing.onvif?.go2rtc || { apiUrl: '' }), streamName: v } }
                                    })}
                                    placeholder="onvif_camera_1（go2rtc 配置中的名称）"
                                />
                                <p className="text-[10px] text-muted-foreground/50 mt-1">
                                    go2rtc 配置示例：streams: {'{'} onvif_camera_1: "onvif://admin:pass@192.168.1.100" {'}'}
                                </p>
                            </div>
                            <div>
                                <Label>播放协议</Label>
                                <div className="flex gap-1.5">
                                    {(['webrtc', 'hls', 'flv'] as const).map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => setEditing({
                                                ...editing,
                                                onvif: { ...editing.onvif!, go2rtc: { ...(editing.onvif?.go2rtc || { apiUrl: '', streamName: '' }), preferredProtocol: p } }
                                            })}
                                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${((editing.onvif?.go2rtc as any)?.preferredProtocol || 'webrtc') === p
                                                    ? 'bg-purple-50 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-600 dark:text-purple-300'
                                                    : 'border-border/30 text-muted-foreground hover:bg-accent/50'
                                                }`}
                                        >
                                            {p === 'webrtc' ? '⚡ WebRTC' : p === 'hls' ? '📺 HLS' : '📡 FLV'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'hass':
                return (
                    <div className="space-y-3">
                        <div>
                            <Label required>摄像头实体 ID</Label>
                            <Input
                                value={editing.hass?.entityId || ''}
                                onChange={(v) => updateField('hass', 'entityId', v)}
                                placeholder="camera.front_door"
                            />
                        </div>
                        {/* 流模式选择 */}
                        <div>
                            <Label>画面模式</Label>
                            <div className="flex gap-1.5">
                                {(['snapshot', 'stream'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => updateField('hass', 'streamMode', m)}
                                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${(editing.hass?.streamMode || 'snapshot') === m
                                                ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300'
                                                : 'border-border/30 text-muted-foreground hover:bg-accent/50'
                                            }`}
                                    >
                                        {m === 'snapshot' ? '🖼 MJPEG 快照流' : '📺 HLS 直播流'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground/50 mt-1">
                                {(editing.hass?.streamMode || 'snapshot') === 'snapshot'
                                    ? 'MJPEG 模式：兼容所有摄像头，实时画面帧率较低'
                                    : 'HLS 模式：流畅度更高，需要 HA 安装 stream 集成'}
                            </p>
                        </div>
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground/70 bg-green-50 dark:bg-green-900/20 border border-green-200/40 rounded-lg px-3 py-2">
                            <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-green-500" />
                            <span>画面通过 HA REST API 代理获取，无需额外配置媒体代理。支持 HA 中所有摄像头实体，包括 RTSP/ONVIF/IP 摄像机。</span>
                        </div>
                    </div>
                );

            case 'ezviz':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label required>AppKey</Label>
                                <Input
                                    value={editing.ezviz?.appKey || ''}
                                    onChange={(v) => updateField('ezviz', 'appKey', v)}
                                    placeholder="萤石开放平台 AppKey"
                                />
                            </div>
                            <div>
                                <Label required>AppSecret</Label>
                                <PwdInput
                                    value={editing.ezviz?.appSecret || ''}
                                    onChange={(v) => updateField('ezviz', 'appSecret', v)}
                                    placeholder="AppSecret"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label required>设备序列号</Label>
                                <Input
                                    value={editing.ezviz?.deviceSerial || ''}
                                    onChange={(v) => updateField('ezviz', 'deviceSerial', v)}
                                    placeholder="设备背面序列号"
                                />
                            </div>
                            <div>
                                <Label>通道号</Label>
                                <Input
                                    value={editing.ezviz?.channelNo || 1}
                                    onChange={(v) => updateField('ezviz', 'channelNo', parseInt(v) || 1)}
                                    placeholder="1"
                                    type="number"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>设备验证码（可选）</Label>
                            <PwdInput
                                value={editing.ezviz?.validateCode || ''}
                                onChange={(v) => updateField('ezviz', 'validateCode', v)}
                                placeholder="设备背面标签上的6位验证码（加密摄像头才需要）"
                            />
                        </div>
                        {/* 协议选择 */}
                        <div>
                            <Label>播放协议</Label>
                            <div className="flex gap-1.5">
                                {([2, 3] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => updateField('ezviz', 'protocol', p)}
                                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${(editing.ezviz?.protocol ?? 2) === p
                                                ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300'
                                                : 'border-border/30 text-muted-foreground hover:bg-accent/50'
                                            }`}
                                    >
                                        {p === 2 ? '📺 HLS（推荐）' : '📡 FLV'}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground/50 mt-1">HLS 兼容性最好，FLV 延迟略低</p>
                        </div>
                        {/* 萤石云方案说明 */}
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground/70 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/40 rounded-lg px-3 py-2.5">
                            <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                            <div className="space-y-1">
                                <p className="font-medium text-amber-700 dark:text-amber-400">✅ 纯前端直连，无需后端代理</p>
                                <p>直接调用萤石开放平台 API 获取实时流地址，AccessToken 自动管理缓存（7天有效）。</p>
                            </div>
                        </div>
                        <a
                            href="https://open.ys7.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-500 hover:text-blue-600 underline flex items-center gap-1"
                        >
                            <ExternalLink className="w-2.5 h-2.5" />
                            获取萤石开放平台 AppKey
                        </a>
                    </div>
                );

            case 'aqara': {
                const mode = editing.aqara?.mode || 'cloud';
                return (
                    <div className="space-y-3">
                        {/* 接入模式切换 */}
                        <div>
                            <Label>接入模式</Label>
                            <div className="flex rounded-lg overflow-hidden border border-border/40">
                                <button
                                    onClick={() => handleAqaraMode('cloud')}
                                    className={`flex-1 py-1.5 text-[12px] font-medium transition-all ${mode === 'cloud'
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-background text-muted-foreground hover:bg-accent/50'
                                        }`}
                                >
                                    ☁ 云端 API
                                </button>
                                <button
                                    onClick={() => handleAqaraMode('local')}
                                    className={`flex-1 py-1.5 text-[12px] font-medium transition-all ${mode === 'local'
                                        ? 'bg-pink-500 text-white'
                                        : 'bg-background text-muted-foreground hover:bg-accent/50'
                                        }`}
                                >
                                    🏠 局域网直连
                                </button>
                            </div>
                        </div>

                        {mode === 'cloud' ? (
                            <>
                                <div>
                                    <Label>设备类型</Label>
                                    <Input
                                        value={editing.aqara?.deviceType || 'Camera'}
                                        onChange={(v) => updateField('aqara', 'deviceType', v)}
                                        placeholder="Camera"
                                        disabled
                                    />
                                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                                        Aqara 设备类型文档：摄像头对应 Camera
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label required>AppId</Label>
                                        <Input
                                            value={editing.aqara?.appId || ''}
                                            onChange={(v) => updateField('aqara', 'appId', v)}
                                            placeholder="Aqara 开放平台 AppId"
                                        />
                                    </div>
                                    <div>
                                        <Label required>AppKey</Label>
                                        <PwdInput
                                            value={editing.aqara?.appKey || ''}
                                            onChange={(v) => updateField('aqara', 'appKey', v)}
                                            placeholder="AppKey"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label required>AccessToken</Label>
                                    <PwdInput
                                        value={editing.aqara?.accessToken || ''}
                                        onChange={(v) => updateField('aqara', 'accessToken', v)}
                                        placeholder="通过 OAuth 2.0 获取的 access_token"
                                    />
                                </div>
                                <div>
                                    <Label required>设备 DID</Label>
                                    <Input
                                        value={editing.aqara?.deviceDid || ''}
                                        onChange={(v) => updateField('aqara', 'deviceDid', v)}
                                        placeholder="设备的 subject_id（开放平台设备列表中获取）"
                                    />
                                </div>
                                <a
                                    href="https://opendoc.aqara.cn/docs/%E4%BA%91%E5%BC%80%E5%8F%91/API%E6%96%87%E6%A1%A3/%E8%AE%BE%E5%A4%87%E7%B1%BB%E5%9E%8B.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-pink-500 hover:text-pink-600 underline block"
                                >
                                    查看 Aqara 设备类型文档 →
                                </a>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <Label required>设备 IP 地址</Label>
                                        <Input
                                            value={editing.aqara?.host || ''}
                                            onChange={(v) => updateField('aqara', 'host', v)}
                                            placeholder="192.168.1.xxx"
                                        />
                                    </div>
                                    <div>
                                        <Label>端口</Label>
                                        <Input
                                            value={editing.aqara?.port || 80}
                                            onChange={(v) => updateField('aqara', 'port', parseInt(v) || 80)}
                                            placeholder="80"
                                            type="number"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label>用户名</Label>
                                        <Input
                                            value={editing.aqara?.username || ''}
                                            onChange={(v) => updateField('aqara', 'username', v)}
                                            placeholder="admin"
                                        />
                                    </div>
                                    <div>
                                        <Label>密码</Label>
                                        <PwdInput
                                            value={editing.aqara?.password || ''}
                                            onChange={(v) => updateField('aqara', 'password', v)}
                                            placeholder="密码"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>码流类型</Label>
                                    <div className="flex gap-2">
                                        {(['main', 'sub'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => updateField('aqara', 'streamType', t)}
                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${(editing.aqara?.streamType || 'main') === t
                                                    ? 'bg-pink-50 border-pink-300 text-pink-700 dark:bg-pink-900/30 dark:border-pink-600'
                                                    : 'border-border/30 text-muted-foreground hover:bg-accent/50'
                                                    }`}
                                            >
                                                {t === 'main' ? '主码流（高清）' : '子码流（流畅）'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                );
            }

            default:
                return null;
        }
    };

    // ──────────── 列表视图 ────────────
    const renderList = () => (
        <div className="space-y-3">
            {/* 顶部统计 & 新增按钮 */}
            <div className="flex items-center justify-between">
                <p className="text-[12px] text-muted-foreground">
                    共 <span className="font-semibold text-foreground">{configs.length}</span> 个摄像头，
                    已启用 <span className="font-semibold text-green-500">{configs.filter(c => c.enabled).length}</span> 个
                </p>
                <button
                    onClick={handleNew}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundImage: 'linear-gradient(140.848deg, rgb(60,60,65) 1.3%, rgb(45,45,48) 103%)' }}
                >
                    <Plus className="w-3.5 h-3.5" />
                    添加摄像头
                </button>
            </div>

            {/* 摄像头列表 */}
            {configs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/40 gap-3">
                    <Video className="w-12 h-12 opacity-25" />
                    <span className="text-[13px]">暂未配置摄像头</span>
                    <span className="text-[11px]">点击右上角"添加摄像头"开始</span>
                </div>
            ) : (
                <div className="space-y-2">
                    {configs.map((c) => {
                        const src = SOURCE_OPTIONS.find((o) => o.value === c.sourceType);
                        const SrcIcon = src?.icon || Video;
                        return (
                            <div
                                key={c.id}
                                className="group flex items-center justify-between p-3 rounded-xl bg-background border border-border/20 hover:border-border/50 hover:shadow-sm transition-all cursor-pointer"
                                onClick={() => handleEdit(c)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* 类型图标 */}
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: `${src?.color}18`, color: src?.color }}
                                    >
                                        <SrcIcon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-medium text-foreground truncate">{c.name}</span>
                                            {/* 启用状态 */}
                                            <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${c.enabled
                                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-muted text-muted-foreground'
                                                    }`}
                                            >
                                                {c.enabled ? '已启用' : '已停用'}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">{src?.label}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {listDeleteId === c.id ? (
                                        <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(c.id, c.name);
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors shadow-sm"
                                            >
                                                确认删除
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setListDeleteId(null);
                                                }}
                                                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setListDeleteId(c.id);
                                                }}
                                                className="p-1.5 opacity-40 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                title="删除"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 支持方式说明 */}
            <div className="border-t border-border/20 pt-3 mt-2">
                <p className="text-[11px] text-muted-foreground/60 mb-2 font-medium">支持的接入方式</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {SOURCE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                            <div
                                key={opt.value}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border/20"
                            >
                                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: opt.color }} />
                                <span className="text-[11px] text-foreground font-medium">{opt.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 安全说明 */}
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground/60 bg-accent/20 border border-border/10 rounded-xl px-3 py-2.5">
                <span className="shrink-0">🔒</span>
                <span>所有密码和密钥均使用 AES 加密后存储在本地浏览器中，不会上传到任何服务器。</span>
            </div>
        </div>
    );

    // ──────────── 编辑视图 ────────────
    const renderEditor = () => {
        if (!editing) return null;
        const isNew = !configs.find((c) => c.id === editing.id);
        const selectedSrc = SOURCE_OPTIONS.find((o) => o.value === editing.sourceType);

        return (
            <div className="space-y-4">
                {/* 返回按钮 */}
                <button
                    onClick={() => setEditing(null)}
                    className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    返回列表
                </button>

                {/* 标题 */}
                <div className="flex items-center gap-2">
                    {selectedSrc && (
                        <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${selectedSrc.color}20`, color: selectedSrc.color }}
                        >
                            <selectedSrc.icon className="w-4 h-4" />
                        </div>
                    )}
                    <h3 className="text-[14px] font-semibold text-foreground">
                        {isNew ? '添加摄像头' : '编辑摄像头'}
                    </h3>
                </div>

                {/* 摄像头名称 */}
                <div>
                    <Label required>摄像头名称</Label>
                    <Input
                        value={editing.name}
                        onChange={(v) => setEditing({ ...editing, name: v })}
                        placeholder="例：客厅摄像头"
                        className="text-[13px]"
                    />
                </div>

                {/* 接入方式选择 */}
                <div>
                    <Label>接入方式</Label>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {SOURCE_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const selected = editing.sourceType === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => handleSourceChange(opt.value)}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all border ${selected
                                        ? 'border-transparent shadow-sm text-foreground'
                                        : 'bg-background border-border/20 text-muted-foreground hover:border-border/50'
                                        }`}
                                    style={selected ? { backgroundColor: `${opt.color}15`, borderColor: `${opt.color}50` } : {}}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" style={selected ? { color: opt.color } : {}} />
                                    <span className="text-[11px] font-medium leading-tight">{opt.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {selectedSrc && (
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">{selectedSrc.desc}</p>
                    )}
                </div>

                {/* 分割线 */}
                <div className="border-t border-border/20" />

                {/* 对应接入方式表单 */}
                {renderForm()}

                {/* 启用/停用开关 */}
                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                    <div>
                        <span className="text-[12px] font-medium text-foreground">启用此摄像头</span>
                        <p className="text-[10px] text-muted-foreground/60">停用后在画面墙中不显示</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setEditing({ ...editing, enabled: !editing.enabled })}
                        className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 ${editing.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                            }`}
                        style={{ height: '22px', minWidth: '40px' }}
                    >
                        <div
                            className={`absolute w-4 h-4 rounded-full bg-white shadow-sm top-[3px] transition-transform duration-200 ${editing.enabled ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                        />
                    </button>
                </div>

                {/* 底部操作 */}
                <div className="flex flex-col gap-2 pt-1">
                    {/* 删除确认行（内联，不用 confirm 弹窗） */}
                    {!isNew && deleteConfirm && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-700/40">
                            <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="text-[12px] text-red-600 dark:text-red-400 flex-1">
                                确认删除「{editing.name}」？此操作不可撤销。
                            </span>
                            <button
                                onClick={() => handleDelete(editing.id, editing.name)}
                                className="px-3 py-1 rounded-md bg-red-500 text-white text-[11px] font-medium hover:bg-red-600 transition-colors shrink-0"
                            >
                                确认删除
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(false)}
                                className="px-3 py-1 rounded-md bg-muted text-muted-foreground text-[11px] hover:bg-accent transition-colors shrink-0"
                            >
                                取消
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setEditing(null); setDeleteConfirm(false); }}
                            className="flex-1 py-2 rounded-lg text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-all border border-border/20"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-2 flex-grow-[2] py-2 rounded-lg text-[12px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            style={{ backgroundImage: 'linear-gradient(140.848deg, rgb(60,60,65) 1.3%, rgb(45,45,48) 103%)' }}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? '保存中...' : '保存'}
                        </button>
                        {!isNew && (
                            <button
                                onClick={() => setDeleteConfirm(true)}
                                className={`p-2 rounded-lg transition-all border ${deleteConfirm
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-500'
                                    : 'border-border/20 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200'
                                    }`}
                                title="删除此摄像头"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full overflow-y-auto">
            {/* 保存成功提示 */}
            {saved && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200/50 rounded-xl text-[12px] text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    摄像头配置已保存
                </div>
            )}

            {/* 内容区 */}
            {editing ? renderEditor() : renderList()}
        </div>
    );
}
