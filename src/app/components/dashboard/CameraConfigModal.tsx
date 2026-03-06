import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Video, Save, Eye, EyeOff, Info } from 'lucide-react';
import type { CameraConfig, CameraSourceType } from '@/types/camera';
import {
    loadCameraConfigs,
    saveCameraConfigs,
    deleteCameraConfig,
} from '@/utils/camera-storage';

// ─── 子组件必须定义在模块顶层，否则每次渲染时重建组件引用会导致 input 失焦 ───

/** 通用文本输入框 */
function TextInput({
    value,
    onChange,
    placeholder,
    type = 'text',
}: {
    value: string | number;
    onChange: (v: string) => void;
    placeholder: string;
    type?: string;
}) {
    return (
        <input
            type={type}
            className="w-full text-[12px] px-3 py-2 rounded-lg bg-background border border-border/30 focus:border-primary/40 outline-none transition-colors"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
        />
    );
}

/** 密码输入框（带眼睛图标），内部自管理可见状态 */
function PwdInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    const [visible, setVisible] = useState(false);
    return (
        <div className="relative">
            <input
                type={visible ? 'text' : 'password'}
                className="w-full text-[12px] px-3 py-2 pr-9 rounded-lg bg-background border border-border/30 focus:border-primary/40 outline-none transition-colors"
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

interface CameraConfigModalProps {
    /** 弹窗是否打开 */
    open: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 配置变更回调，通知父组件刷新 */
    onConfigChange: (configs: CameraConfig[]) => void;
}

/** 接入方式选项 */
const SOURCE_OPTIONS: { value: CameraSourceType; label: string; desc: string }[] = [
    { value: 'rtsp', label: 'RTSP 流', desc: '直接输入 RTSP 地址' },
    { value: 'onvif', label: 'ONVIF', desc: '通过 ONVIF 协议发现视频流' },
    { value: 'hass', label: 'Home Assistant', desc: '对接 HA 中的摄像头实体' },
    { value: 'ezviz', label: '萤石云', desc: '萤石云开放平台接入' },
];

/** 生成唯一 ID */
const genId = () => `cam_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export default function CameraConfigModal({
    open,
    onClose,
    onConfigChange,
}: CameraConfigModalProps) {
    // 所有已保存的配置
    const [configs, setConfigs] = useState<CameraConfig[]>([]);
    // 当前正在编辑/新建的配置（null 表示列表视图）
    const [editing, setEditing] = useState<CameraConfig | null>(null);
    // 保存中状态
    const [saving, setSaving] = useState(false);

    // 打开弹窗时加载配置
    useEffect(() => {
        if (open) {
            setConfigs(loadCameraConfigs());
            setEditing(null);
        }
    }, [open]);

    if (!open) return null;

    /** 创建空白新配置 */
    const handleNew = () => {
        setEditing({
            id: genId(),
            name: '',
            sourceType: 'rtsp',
            rtsp: { streamUrl: '' },
            enabled: true,
            createdAt: Date.now(),
        });
    };

    /** 编辑已有配置 */
    const handleEdit = (c: CameraConfig) => {
        setEditing({ ...c });
    };

    /** 删除配置 */
    const handleDelete = (id: string) => {
        const updated = deleteCameraConfig(id);
        setConfigs(updated);
        onConfigChange(updated);
    };

    /** 切换接入方式时初始化对应字段 */
    const handleSourceChange = (type: CameraSourceType) => {
        if (!editing) return;
        const base = { ...editing, sourceType: type };
        // 清理旧配置，初始化新配置
        delete base.rtsp;
        delete base.onvif;
        delete base.hass;
        delete base.ezviz;

        switch (type) {
            case 'rtsp':
                base.rtsp = { streamUrl: '' };
                break;
            case 'onvif':
                base.onvif = { host: '', port: 80, username: '', password: '' };
                break;
            case 'hass':
                base.hass = { entityId: '' };
                break;
            case 'ezviz':
                base.ezviz = { appKey: '', appSecret: '', deviceSerial: '', channelNo: 1 };
                break;
        }
        setEditing(base);
    };

    /** 更新嵌套字段的通用工具 */
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

    /** 保存配置 */
    const handleSave = () => {
        if (!editing || !editing.name.trim()) return;
        setSaving(true);

        // 使用 setTimeout 模拟异步，让 UI 有反馈
        setTimeout(() => {
            const idx = configs.findIndex((c) => c.id === editing.id);
            let updated: CameraConfig[];
            if (idx >= 0) {
                updated = configs.map((c) => (c.id === editing.id ? editing : c));
            } else {
                updated = [...configs, editing];
            }
            saveCameraConfigs(updated);
            setConfigs(updated);
            onConfigChange(updated);
            setEditing(null);
            setSaving(false);
        }, 150);
    };


    /** 密码输入框组件 — 已提至模块顶层，此处仅保留 TextInput 作为局部别名 */

    /** 通用文本输入 — 已提至模块顶层（TextInput） */

    /** 渲染对应接入方式的表单 */
    const renderForm = () => {
        if (!editing) return null;

        switch (editing.sourceType) {
            case 'rtsp':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">RTSP 流地址 *</label>
                            <TextInput
                                value={editing.rtsp?.streamUrl || ''}
                                onChange={(v) => updateField('rtsp', 'streamUrl', v)}
                                placeholder="rtsp://192.168.1.100:554/stream1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">用户名</label>
                                <TextInput
                                    value={editing.rtsp?.username || ''}
                                    onChange={(v) => updateField('rtsp', 'username', v)}
                                    placeholder="可选"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">密码</label>
                                <PwdInput
                                    value={editing.rtsp?.password || ''}
                                    onChange={(v) => updateField('rtsp', 'password', v)}
                                    placeholder="可选"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'onvif':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <label className="text-[11px] text-muted-foreground mb-1 block">设备地址 *</label>
                                <TextInput
                                    value={editing.onvif?.host || ''}
                                    onChange={(v) => updateField('onvif', 'host', v)}
                                    placeholder="192.168.1.100"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">端口</label>
                                <TextInput
                                    value={editing.onvif?.port || 80}
                                    onChange={(v) => updateField('onvif', 'port', parseInt(v) || 80)}
                                    placeholder="80"
                                    type="number"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">用户名 *</label>
                                <TextInput
                                    value={editing.onvif?.username || ''}
                                    onChange={(v) => updateField('onvif', 'username', v)}
                                    placeholder="admin"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">密码 *</label>
                                <PwdInput
                                    value={editing.onvif?.password || ''}
                                    onChange={(v) => updateField('onvif', 'password', v)}
                                    placeholder="密码"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">Profile Token</label>
                            <TextInput
                                value={editing.onvif?.profileToken || ''}
                                onChange={(v) => updateField('onvif', 'profileToken', v)}
                                placeholder="可选，留空使用默认"
                            />
                        </div>
                    </div>
                );

            case 'hass':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">摄像头实体 ID *</label>
                            <TextInput
                                value={editing.hass?.entityId || ''}
                                onChange={(v) => updateField('hass', 'entityId', v)}
                                placeholder="camera.front_door"
                            />
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 bg-accent/30 rounded-lg px-3 py-2">
                            💡 使用已连接的 Home Assistant 实例中的 camera 实体。确保已在系统设置中配置 HA 连接。
                        </div>
                    </div>
                );

            case 'ezviz':
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">AppKey *</label>
                                <PwdInput
                                    value={editing.ezviz?.appKey || ''}
                                    onChange={(v) => updateField('ezviz', 'appKey', v)}
                                    placeholder="萤石开放平台 AppKey"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">AppSecret *</label>
                                <PwdInput
                                    value={editing.ezviz?.appSecret || ''}
                                    onChange={(v) => updateField('ezviz', 'appSecret', v)}
                                    placeholder="AppSecret"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">设备序列号 *</label>
                                <TextInput
                                    value={editing.ezviz?.deviceSerial || ''}
                                    onChange={(v) => updateField('ezviz', 'deviceSerial', v)}
                                    placeholder="设备序列号"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">通道号</label>
                                <TextInput
                                    value={editing.ezviz?.channelNo || 1}
                                    onChange={(v) => updateField('ezviz', 'channelNo', parseInt(v) || 1)}
                                    placeholder="1"
                                    type="number"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">设备验证码</label>
                            <PwdInput
                                value={editing.ezviz?.validateCode || ''}
                                onChange={(v) => updateField('ezviz', 'validateCode', v)}
                                placeholder="设备背面标签上的验证码"
                            />
                        </div>
                        {/* 萤石云方案说明：推荐直连，HA 方式为备选 */}
                        <div className="flex items-start gap-2 text-[10px] text-muted-foreground/70 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/40 rounded-lg px-3 py-2">
                            <Info className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
                            <div className="space-y-0.5">
                                <p className="font-medium text-amber-700 dark:text-amber-400">✅ 推荐：直连萤石开放平台（无需 HA）</p>
                                <p>填入 AppKey / AppSecret 即可直接获取实时视频流。</p>
                                <p className="text-muted-foreground/50">已有 HA？可切换到「Home Assistant」方式，但 HA 仅支持图片快照，无实时流。</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card rounded-2xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col overflow-hidden border border-border/10 animate-in zoom-in-95 duration-200">
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/10 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                            style={{
                                backgroundImage:
                                    'linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)',
                            }}
                        >
                            <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[14px] font-semibold text-foreground">
                            {editing ? (configs.find((c) => c.id === editing.id) ? '编辑摄像头' : '添加摄像头') : '摄像头管理'}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            if (editing) {
                                setEditing(null);
                            } else {
                                onClose();
                            }
                        }}
                        className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 内容区 */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {editing ? (
                        /* ========== 编辑/新建表单 ========== */
                        <div className="space-y-4">
                            {/* 名称 */}
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1 block">摄像头名称 *</label>
                                <TextInput
                                    value={editing.name}
                                    onChange={(v) => setEditing({ ...editing, name: v })}
                                    placeholder="例：客厅摄像头"
                                />
                            </div>

                            {/* 接入方式选择 */}
                            <div>
                                <label className="text-[11px] text-muted-foreground mb-1.5 block">接入方式</label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {SOURCE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSourceChange(opt.value)}
                                            className={`px-3 py-2 rounded-lg text-left transition-all border ${editing.sourceType === opt.value
                                                ? 'bg-primary/10 border-primary/30 text-foreground'
                                                : 'bg-accent/30 border-transparent text-muted-foreground hover:bg-accent/50'
                                                }`}
                                        >
                                            <span className="text-[12px] font-medium block">{opt.label}</span>
                                            <span className="text-[10px] opacity-60">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 分割线 */}
                            <div className="border-t border-border/10" />

                            {/* 对应表单 */}
                            {renderForm()}

                            {/* 启用开关 */}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-[12px] text-muted-foreground">启用此摄像头</span>
                                <button
                                    onClick={() => setEditing({ ...editing, enabled: !editing.enabled })}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${editing.enabled ? 'bg-primary' : 'bg-muted-foreground/30'
                                        }`}
                                >
                                    <div
                                        className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${editing.enabled ? 'translate-x-5' : 'translate-x-0.5'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* 隐私提示 */}
                            <div className="text-[10px] text-muted-foreground/50 bg-accent/20 rounded-lg px-3 py-2 flex items-start gap-1.5">
                                <span className="shrink-0 mt-0.5">🔒</span>
                                <span>所有密码和密钥均使用 AES 加密后存储在本地浏览器中，不会上传到任何服务器。</span>
                            </div>
                        </div>
                    ) : (
                        /* ========== 列表视图 ========== */
                        <div className="space-y-2">
                            {configs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40 gap-3">
                                    <Video className="w-10 h-10 opacity-30" />
                                    <span className="text-[13px]">暂未配置摄像头</span>
                                    <span className="text-[11px]">点击下方按钮添加</span>
                                </div>
                            ) : (
                                configs.map((c) => (
                                    <div
                                        key={c.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors group cursor-pointer"
                                        onClick={() => handleEdit(c)}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`w-2 h-2 rounded-full shrink-0 ${c.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                                                    }`}
                                            />
                                            <div className="min-w-0">
                                                <div className="text-[13px] font-medium text-foreground truncate">
                                                    {c.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {SOURCE_OPTIONS.find((o) => o.value === c.sourceType)?.label}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(c.id);
                                            }}
                                            className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive rounded-full hover:bg-accent"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* 底部操作栏 */}
                <div className="px-5 py-3 border-t border-border/10 shrink-0 flex justify-between">
                    {editing ? (
                        <>
                            <button
                                onClick={() => setEditing(null)}
                                className="px-4 py-2 text-[12px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!editing.name.trim() || saving}
                                className="px-4 py-2 text-[12px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {saving ? '保存中...' : '保存'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-[12px] text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                            >
                                关闭
                            </button>
                            <button
                                onClick={handleNew}
                                className="px-4 py-2 text-[12px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                添加摄像头
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
