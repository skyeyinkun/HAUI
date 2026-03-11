import React, { useState, useRef, useCallback } from 'react';
import { GridLayout } from 'react-grid-layout';
import { useContainerWidth } from 'react-grid-layout';
// 必须导入核心 CSS，否则 react-grid-layout 的基本大小计算会彻底崩盘
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { CameraPlayer } from './CameraPlayer';
import { CameraConfig } from './types';
import { Plus, Grid2x2, Square, LayoutDashboard } from 'lucide-react';

// 单个布局项的类型定义
interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

// 【注意】：此处为给前端静态调试展示用的模拟数据
const MOCK_CAMERAS: CameraConfig[] = [
    { id: 'cam1', name: '大门外侧 (Ezviz)', type: 'ezviz', url: 'ezopen://open.ys7.com/abc/1.hd.live', accessToken: 'mock_token' },
    { id: 'cam2', name: '客厅顶配 (HLS)', type: 'ha-hls', url: '/api/hls/mock_abc123.m3u8' },
    { id: 'cam3', name: '院子监控 (HLS)', type: 'ha-hls', url: '/api/hls/mock_def456.m3u8' },
];

export const CameraDashboard: React.FC<{ availableCameras?: CameraConfig[] }> = ({ 
    availableCameras = MOCK_CAMERAS 
}) => {
    const [activeCameras, setActiveCameras] = useState<CameraConfig[]>([]);
    const [layouts, setLayouts] = useState<LayoutItem[]>([]);

    // 使用 react-grid-layout v2 的 useContainerWidth hook 获取容器宽度
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const containerWidth = useContainerWidth(gridContainerRef);

    const handleAddCamera = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (!id) return;
        
        // 过滤已添加，防止产生重复布局和重名 id
        if (activeCameras.find(c => c.id === id)) {
            e.target.value = '';
            return; 
        }
        
        const cam = availableCameras.find(c => c.id === id);
        if (cam) {
            setActiveCameras(prev => [...prev, cam]);
            setLayouts(prev => [
                ...prev,
                { i: cam.id, x: (prev.length % 2) * 6, y: Infinity, w: 6, h: 8 }
            ]);
        }
        e.target.value = ''; 
    };

    const handleRemove = useCallback((id: string) => {
        setActiveCameras(prev => prev.filter(c => c.id !== id));
        setLayouts(prev => prev.filter(l => l.i !== id));
    }, []);

    const onLayoutChange = useCallback((newLayout: LayoutItem[]) => {
        setLayouts(newLayout);
    }, []);

    // 单屏全铺
    const applyLayout1x1 = () => {
        if (activeCameras.length === 0) return;
        const newLayouts: LayoutItem[] = activeCameras.map((cam, idx) => ({
             i: cam.id, x: 0, y: idx * 16, w: 12, h: 16
        }));
        setLayouts(newLayouts);
    };

    // 四宫格
    const applyLayout2x2 = () => {
        const newLayouts: LayoutItem[] = activeCameras.map((cam, idx) => ({
             i: cam.id, x: (idx % 2) * 6, y: Math.floor(idx / 2) * 8, w: 6, h: 8
        }));
        setLayouts(newLayouts);
    };

    return (
        <div className="w-full min-h-[calc(100vh-80px)] bg-neutral-950 p-4 flex flex-col gap-4 text-white">
            {/* ====== Dashboard 顶栏 ====== */}
            <div className="flex flex-wrap items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-md z-10 transition-all">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold tracking-wide flex items-center gap-2 text-neutral-100">
                        <LayoutDashboard className="text-blue-500" size={20} />
                        监控大屏
                    </h2>
                    
                    <div className="relative">
                        <select 
                            onChange={handleAddCamera}
                            defaultValue=""
                            className="bg-neutral-800 text-neutral-200 border border-neutral-700 text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-8 cursor-pointer transition-colors hover:bg-neutral-700"
                        >
                            <option value="" disabled>+ 添加监控画面</option>
                            {availableCameras.map(cam => (
                                <option key={cam.id} value={cam.id} disabled={!!activeCameras.find(a => a.id === cam.id)}>
                                    {cam.name} {activeCameras.find(a => a.id === cam.id) ? '(已在展板)' : ''}
                                </option>
                            ))}
                        </select>
                        <Plus size={14} className="absolute right-2.5 top-[10px] pointer-events-none text-neutral-400" />
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                    <button onClick={applyLayout1x1} title="单列放大响应式布局" className="p-2 hover:bg-blue-500/20 rounded transition-colors text-neutral-400 hover:text-blue-400">
                        <Square size={18} />
                    </button>
                    <button onClick={applyLayout2x2} title="四宫格高密度布局" className="p-2 hover:bg-blue-500/20 rounded transition-colors text-neutral-400 hover:text-blue-400">
                        <Grid2x2 size={18} />
                    </button>
                </div>
            </div>

            {/* ====== 响应式 GridLayout ====== */}
            <div ref={gridContainerRef} className="flex-1 bg-neutral-900/40 rounded-xl border border-neutral-800/80 overflow-auto relative p-2 md:p-4 min-h-[400px]">
                {activeCameras.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 bg-neutral-900/10 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-neutral-800/50 flex items-center justify-center mb-4 border border-neutral-800">
                            <Plus size={24} className="text-neutral-500" />
                        </div>
                        <p className="tracking-wide">大屏幕目前为空，添加前置画面开始监控</p>
                    </div>
                ) : containerWidth ? (
                    <GridLayout
                        className="layout min-h-full"
                        layout={layouts as any}
                        cols={12}
                        rowHeight={40}
                        width={containerWidth}
                        onLayoutChange={onLayoutChange as any}
                        draggableHandle=".drag-handle"
                        margin={[16, 16] as [number, number]}
                        useCSSTransforms={true}
                        resizeHandles={['se', 'e', 's']}
                    >
                        {activeCameras.map(cam => (
                            <div key={cam.id} className="relative z-0 group">
                                <CameraPlayer config={cam} onRemove={handleRemove} />
                            </div>
                        ))}
                    </GridLayout>
                ) : null}
            </div>
        </div>
    );
};
