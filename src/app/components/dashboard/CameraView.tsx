/**
 * 摄像头画面墙 & 单画面视图
 *
 * 功能：
 *  - 单画面模式：逐个切换摄像头
 *  - 画面墙模式：多格子同时显示，支持 1x1 / 2x2 / 3x3 / 1+2 / 1+3 / 2+4 布局
 *  - 拖拽分配：每格可选择具体摄像头
 *  - 全屏、刷新等控制
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Video, VideoOff, Settings2, ChevronLeft, ChevronRight,
    Maximize2, Minimize2, RefreshCw, LayoutGrid, LayoutTemplate,
    Plus, GripVertical, X, Check
} from 'lucide-react';
import type { CameraConfig, CameraLayout, CameraWallLayout } from '@/types/camera';
import { LAYOUT_SLOT_COUNT } from '@/types/camera';
import { loadCameraConfigs, loadCameraWallLayout, saveCameraWallLayout } from '@/utils/camera-storage';
import StreamPlayer from './StreamPlayer';

interface CameraViewProps {
    /** 打开摄像头设置回调 */
    onOpenConfig: () => void;
    /** HA Base URL */
    haBaseUrl?: string;
    /** HA Long-Lived Token，用于请求 camera stream */
    haToken?: string;
}

// ──────────── 布局元数据 ────────────
const LAYOUTS: { value: CameraLayout; label: string; grid: string; areas: string[] }[] = [
    {
        value: '1x1',
        label: '单画面',
        grid: 'grid-cols-1 grid-rows-1',
        areas: ['1/1/2/2'],
    },
    {
        value: '2x2',
        label: '四画面',
        grid: 'grid-cols-2 grid-rows-2',
        areas: ['1/1/2/2', '1/2/2/3', '2/1/3/2', '2/2/3/3'],
    },
    {
        value: '3x3',
        label: '九画面',
        grid: 'grid-cols-3 grid-rows-3',
        areas: [
            '1/1/2/2', '1/2/2/3', '1/3/2/4',
            '2/1/3/2', '2/2/3/3', '2/3/3/4',
            '3/1/4/2', '3/2/4/3', '3/3/4/4',
        ],
    },
    {
        value: '1+2',
        label: '一大两小',
        grid: 'grid-cols-3 grid-rows-2',
        areas: ['1/1/3/3', '1/3/2/4', '2/3/3/4'],
    },
    {
        value: '1+3',
        label: '一大三小',
        grid: 'grid-cols-4 grid-rows-2',
        areas: ['1/1/3/3', '1/3/2/5', '2/3/3/4', '2/4/3/5'],
    },
    {
        value: '2+4',
        label: '两大四小',
        grid: 'grid-cols-4 grid-rows-3',
        areas: ['1/1/3/3', '1/3/3/5', '3/1/4/2', '3/2/4/3', '3/3/4/4', '3/4/4/5'],
    },
];

// ──────────── 工具函数 ────────────

// ──────────── 单格子摄像头视图 ────────────
interface CellProps {
    cam: CameraConfig | null;
    haBaseUrl?: string;
    /** HA Long-Lived Token */
    haToken?: string;
    refreshKey: number;
    /** 是否在编辑模式（可选择摄像头） */
    editing: boolean;
    cameras: CameraConfig[];
    onAssign: (camId: string | null) => void;
    slotIndex: number;
}

function CameraCell({ cam, haBaseUrl, haToken, refreshKey, editing, cameras, onAssign, slotIndex }: CellProps) {
    const [showSelect, setShowSelect] = useState(false);

    if (!cam) {
        // 空格子
        return (
            <div className="relative h-full bg-black/5 dark:bg-black/20 rounded-lg border border-dashed border-border/30 flex items-center justify-center group/cell">
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground/30">
                    <VideoOff className="w-5 h-5" />
                    <span className="text-[10px]">空格 {slotIndex + 1}</span>
                </div>
                {editing && (
                    <button
                        onClick={() => setShowSelect(true)}
                        className="absolute inset-0 rounded-lg opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center bg-black/20 backdrop-blur-sm"
                    >
                        <Plus className="w-5 h-5 text-white" />
                    </button>
                )}
                {/* 摄像头选择下拉 */}
                {editing && showSelect && (
                    <CamSelectDropdown
                        cameras={cameras}
                        onSelect={(id) => { onAssign(id); setShowSelect(false); }}
                        onClose={() => setShowSelect(false)}
                        currentId={null}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="relative h-full bg-black/10 dark:bg-black/30 rounded-lg overflow-hidden group/cell flex items-center justify-center">
            <StreamPlayer cam={cam} haBaseUrl={haBaseUrl} haToken={haToken} refreshKey={refreshKey} />

            {/* 摄像头名称标签 */}
            <div className="absolute top-1 left-1 z-20 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                    <div className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[9px] text-white/90 font-medium truncate max-w-[80px]">{cam.name}</span>
                </div>
            </div>

            {/* 编辑模式：重新分配按钮 */}
            {editing && (
                <div className="absolute top-1 right-1 z-20 flex gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                    <button
                        onClick={() => setShowSelect(true)}
                        className="p-1 rounded-md bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                        title="更换摄像头"
                    >
                        <GripVertical className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => onAssign(null)}
                        className="p-1 rounded-md bg-black/50 backdrop-blur-sm text-white/80 hover:text-red-400 hover:bg-black/70 transition-colors"
                        title="移除"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* 摄像头选择下拉 */}
            {editing && showSelect && (
                <CamSelectDropdown
                    cameras={cameras}
                    onSelect={(id) => { onAssign(id); setShowSelect(false); }}
                    onClose={() => setShowSelect(false)}
                    currentId={cam.id}
                />
            )}
        </div>
    );
}

// ──────────── 摄像头选择下拉 ────────────
function CamSelectDropdown({
    cameras,
    onSelect,
    onClose,
    currentId,
}: {
    cameras: CameraConfig[];
    onSelect: (id: string | null) => void;
    onClose: () => void;
    currentId: string | null;
}) {
    return (
        <>
            {/* 遮罩 */}
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-card border border-border/20 rounded-xl shadow-xl w-44 overflow-hidden">
                <div className="px-2 py-1.5 border-b border-border/10">
                    <span className="text-[10px] text-muted-foreground font-medium">选择摄像头</span>
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                    {cameras.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => onSelect(c.id)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] hover:bg-accent/50 transition-colors ${c.id === currentId ? 'text-primary' : 'text-foreground'}`}
                        >
                            {c.id === currentId && <Check className="w-3 h-3 text-primary shrink-0" />}
                            <span className={`truncate ${c.id !== currentId ? 'pl-5' : ''}`}>{c.name}</span>
                        </button>
                    ))}
                    {currentId && (
                        <button
                            onClick={() => onSelect(null)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <X className="w-3 h-3 shrink-0" />
                            <span>移除此格</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}

// ──────────── 主组件 ────────────
export default function CameraView({ onOpenConfig, haBaseUrl, haToken }: CameraViewProps) {
    // 所有已启用的摄像头
    const [cameras, setCameras] = useState<CameraConfig[]>([]);
    // 单画面：当前选中索引
    const [currentIdx, setCurrentIdx] = useState(0);
    // 全局刷新计数
    const [refreshKey, setRefreshKey] = useState(0);
    // 视图模式
    const [viewMode, setViewMode] = useState<'single' | 'wall'>('single');
    // 画面墙布局配置
    const [wallLayout, setWallLayout] = useState<CameraWallLayout>({ layout: '2x2', slots: [null, null, null, null] });
    // 是否在编辑画面墙（分配摄像头到格子）
    const [wallEditing, setWallEditing] = useState(false);
    // 全屏引用
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    /** 外部刷新：重新加载配置 + 递增 refreshKey */
    const reload = useCallback(() => {
        const all = loadCameraConfigs();
        const enabled = all.filter((c) => c.enabled);
        setCameras(enabled);
        setRefreshKey((k) => k + 1);
    }, []);

    // 初始加载
    useEffect(() => {
        const all = loadCameraConfigs();
        const enabled = all.filter((c) => c.enabled);
        setCameras(enabled);

        // 恢复画面墙布局
        const saved = loadCameraWallLayout();
        if (saved) {
            // 校验 slots 长度
            const slotCount = LAYOUT_SLOT_COUNT[saved.layout];
            const fixedSlots = Array.from({ length: slotCount }, (_, i) => saved.slots[i] ?? null);
            setWallLayout({ ...saved, slots: fixedSlots });
        } else if (enabled.length > 0) {
            // 默认自动填充第一屏
            const defaultLayout: CameraLayout = enabled.length === 1 ? '1x1' : '2x2';
            const count = LAYOUT_SLOT_COUNT[defaultLayout];
            const slots = Array.from({ length: count }, (_, i) => enabled[i]?.id ?? null);
            setWallLayout({ layout: defaultLayout, slots });
        }

        // 监听配置变更事件
        const handleConfigChange = () => {
            reload();
        };
        window.addEventListener('camera-config-changed', handleConfigChange);
        return () => window.removeEventListener('camera-config-changed', handleConfigChange);
    }, [reload]);

    // 监听全屏状态
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    /** 切换布局类型 */
    const handleLayoutChange = (layout: CameraLayout) => {
        const count = LAYOUT_SLOT_COUNT[layout];
        // 保留原来已分配的格子，超出则截断
        const newSlots = Array.from({ length: count }, (_, i) => wallLayout.slots[i] ?? null);
        // 自动用可用摄像头填充空格
        const camQueue = cameras.filter((c) => !newSlots.includes(c.id));
        const filledSlots = newSlots.map((s) => {
            if (s !== null) return s;
            return camQueue.shift()?.id ?? null;
        });
        const newLayout: CameraWallLayout = { layout, slots: filledSlots };
        setWallLayout(newLayout);
        saveCameraWallLayout(newLayout);
    };

    /** 给某个格子分配摄像头 */
    const handleSlotAssign = (slotIdx: number, camId: string | null) => {
        const newSlots = [...wallLayout.slots];
        newSlots[slotIdx] = camId;
        const newLayout = { ...wallLayout, slots: newSlots };
        setWallLayout(newLayout);
        saveCameraWallLayout(newLayout);
    };

    /** 全屏切换 */
    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            await containerRef.current.requestFullscreen?.();
        } else {
            await document.exitFullscreen?.();
        }
    };

    /** 全屏图标：全屏中显示 Minimize2，否则显示 Maximize2 */
    const FullscreenIcon = isFullscreen ? Minimize2 : Maximize2;

    const currentCam = cameras[currentIdx] || null;
    const layoutMeta = LAYOUTS.find((l) => l.value === wallLayout.layout) || LAYOUTS[1];

    // ──────── 无摄像头空状态 ────────
    if (cameras.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/40">
                <VideoOff className="w-8 h-8 opacity-40" />
                <span className="text-[12px]">暂未配置摄像头</span>
                <button
                    onClick={onOpenConfig}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                    前往配置
                </button>
            </div>
        );
    }

    // ──────── 顶部工具栏 ────────
    const Toolbar = () => (
        <div className="flex items-center justify-between shrink-0 mb-1.5">
            {/* 视图切换 */}
            <div className="flex items-center bg-accent/40 rounded-lg p-0.5">
                <button
                    onClick={() => setViewMode('single')}
                    title="单画面"
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'single' ? 'bg-white dark:bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Video className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setViewMode('wall')}
                    title="画面墙"
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'wall' ? 'bg-white dark:bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <LayoutGrid className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* 右侧操作 */}
            <div className="flex items-center gap-1">
                {viewMode === 'wall' && (
                    <button
                        onClick={() => setWallEditing(!wallEditing)}
                        title={wallEditing ? '完成布局编辑' : '编辑画面墙布局'}
                        className={`p-1.5 rounded-md transition-all ${wallEditing ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
                    >
                        <LayoutTemplate className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={reload}
                    title="刷新"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={toggleFullscreen}
                    title={isFullscreen ? '退出全屏' : '全屏'}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                >
                    <FullscreenIcon className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onOpenConfig}
                    title="摄像头设置"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
                >
                    <Settings2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );

    // ──────────── 单画面模式 ────────────
    if (viewMode === 'single') {
        return (
            <div ref={containerRef} className="flex flex-col h-full">
                <Toolbar />

                {/* 画面 */}
                <div className="flex-1 relative overflow-hidden rounded-lg bg-black/10 dark:bg-black/25 group/cam flex items-center justify-center">
                    {currentCam ? (
                        <StreamPlayer cam={currentCam} haBaseUrl={haBaseUrl} haToken={haToken} refreshKey={refreshKey} />
                    ) : null}

                    {/* 顶部条 */}
                    <div className="absolute top-0 left-0 right-0 z-20 opacity-0 group-hover/cam:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/50 to-transparent">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                <span className="text-[11px] text-white font-medium drop-shadow-sm truncate max-w-[140px]">
                                    {currentCam?.name}
                                </span>
                            </div>
                            <span className="text-[9px] text-white/60 px-1.5 py-0.5 rounded bg-black/20">
                                {currentIdx + 1} / {cameras.length}
                            </span>
                        </div>
                    </div>

                    {/* 左右切换（多摄像头时） */}
                    {cameras.length > 1 && (
                        <>
                            <button
                                onClick={() => { setCurrentIdx((i) => (i - 1 + cameras.length) % cameras.length); }}
                                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white opacity-0 group-hover/cam:opacity-100 transition-opacity hover:bg-black/50"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => { setCurrentIdx((i) => (i + 1) % cameras.length); }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/30 text-white opacity-0 group-hover/cam:opacity-100 transition-opacity hover:bg-black/50"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>

                {/* 多摄像头缩略选择条 */}
                {cameras.length > 1 && (
                    <div className="flex items-center gap-1.5 pt-1.5 shrink-0 overflow-x-auto scrollbar-none">
                        {cameras.map((cam, idx) => (
                            <button
                                key={cam.id}
                                onClick={() => setCurrentIdx(idx)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] transition-all whitespace-nowrap shrink-0 border ${idx === currentIdx
                                    ? 'bg-primary/10 text-foreground border-primary/20'
                                    : 'bg-accent/20 text-muted-foreground border-transparent hover:bg-accent/40'
                                    }`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${idx === currentIdx ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                {cam.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ──────────── 画面墙模式 ────────────
    return (
        <div ref={containerRef} className="flex flex-col h-full">
            <Toolbar />

            {/* 布局选择条（编辑模式下显示） */}
            {wallEditing && (
                <div className="flex items-center gap-1.5 mb-1.5 shrink-0 overflow-x-auto scrollbar-none">
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">布局：</span>
                    {LAYOUTS.map((l) => (
                        <button
                            key={l.value}
                            onClick={() => handleLayoutChange(l.value)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap shrink-0 transition-all border ${wallLayout.layout === l.value
                                ? 'bg-primary/10 border-primary/20 text-foreground'
                                : 'bg-background border-border/20 text-muted-foreground hover:border-border/40'
                                }`}
                        >
                            {l.label}
                        </button>
                    ))}
                    <span className="text-[10px] text-muted-foreground/40 shrink-0 ml-auto">点击格子分配摄像头</span>
                </div>
            )}

            {/* 画面墙网格 */}
            <div
                className={`flex-1 grid gap-1.5 min-h-0`}
                style={{
                    gridTemplateColumns: getCssGridCols(wallLayout.layout),
                    gridTemplateRows: getCssGridRows(wallLayout.layout),
                }}
            >
                {wallLayout.slots.map((camId, idx) => {
                    const cam = cameras.find((c) => c.id === camId) || null;
                    const area = layoutMeta.areas[idx] || undefined;
                    return (
                        <div
                            key={idx}
                            style={area ? { gridArea: area } : undefined}
                            className="min-h-0"
                        >
                            <CameraCell
                                cam={cam}
                                haBaseUrl={haBaseUrl}
                                haToken={haToken}
                                refreshKey={refreshKey}
                                editing={wallEditing}
                                cameras={cameras}
                                onAssign={(id) => handleSlotAssign(idx, id)}
                                slotIndex={idx}
                            />
                        </div>
                    );
                })}
            </div>

            {/* 编辑模式底部：完成按钮 */}
            {wallEditing && (
                <button
                    onClick={() => setWallEditing(false)}
                    className="mt-1.5 shrink-0 py-1.5 rounded-lg text-[11px] font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                >
                    <Check className="w-3.5 h-3.5" />
                    完成布局编辑
                </button>
            )}
        </div>
    );
}

// ──────────── CSS Grid 辅助 ────────────
function getCssGridCols(layout: CameraLayout): string {
    const map: Record<CameraLayout, string> = {
        '1x1': '1fr',
        '2x2': '1fr 1fr',
        '3x3': '1fr 1fr 1fr',
        '1+2': '2fr 1fr',
        '1+3': '1fr 1fr 1fr 1fr',
        '2+4': '1fr 1fr 1fr 1fr',
    };
    return map[layout] || '1fr 1fr';
}

function getCssGridRows(layout: CameraLayout): string {
    const map: Record<CameraLayout, string> = {
        '1x1': '1fr',
        '2x2': '1fr 1fr',
        '3x3': '1fr 1fr 1fr',
        '1+2': '1fr 1fr',
        '1+3': '1fr 1fr',
        '2+4': '1fr 1fr 1fr',
    };
    return map[layout] || '1fr 1fr';
}
