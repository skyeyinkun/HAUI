import { useMemo, useState } from 'react';
import { ArrowLeft, Camera, Grid2x2, Monitor, Settings2, ShieldCheck, Square } from 'lucide-react';
import { CameraConfig } from './types';
import { CameraPlayer } from './CameraPlayer';

interface CameraMonitorPanelProps {
  cameras: CameraConfig[];
  onBack: () => void;
  onOpenSettings: () => void;
}

type LayoutMode = 'single' | 'grid';

export function CameraMonitorPanel({ cameras, onBack, onOpenSettings }: CameraMonitorPanelProps) {
  const [selectedCameraId, setSelectedCameraId] = useState(cameras[0]?.id || '');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');

  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId) || cameras[0],
    [cameras, selectedCameraId]
  );

  const visibleCameras = layoutMode === 'single' && selectedCamera ? [selectedCamera] : cameras;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <div className="shrink-0 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-[2400px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gray-100 text-[#334155] transition-colors hover:bg-gray-200"
              aria-label="返回首页"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-[#334155]" />
                <h2 className="truncate text-[18px] font-semibold text-[#040415]">监控面板</h2>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-gray-500">
                {cameras.length > 0 ? `${cameras.length} 路摄像头，画面优先走本地代理或设备通道` : '暂无摄像头配置'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cameras.length > 0 && (
              <select
                value={selectedCamera?.id || ''}
                onChange={(event) => {
                  setSelectedCameraId(event.target.value);
                  setLayoutMode('single');
                }}
                className="h-10 min-w-[160px] rounded-[14px] border border-gray-200 bg-white px-3 text-[13px] font-medium text-[#334155] outline-none transition-all focus:border-[#334155] focus:ring-2 focus:ring-gray-100"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex rounded-[14px] bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setLayoutMode('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors ${
                  layoutMode === 'grid' ? 'bg-white text-[#040415] shadow-sm' : 'text-gray-400 hover:text-[#334155]'
                }`}
                title="多画面"
                aria-label="多画面"
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('single')}
                disabled={!selectedCamera}
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors disabled:opacity-40 ${
                  layoutMode === 'single' ? 'bg-white text-[#040415] shadow-sm' : 'text-gray-400 hover:text-[#334155]'
                }`}
                title="单画面"
                aria-label="单画面"
              >
                <Square className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex h-10 items-center gap-2 rounded-[14px] bg-[#040415] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Settings2 className="h-4 w-4" />
              配置
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        <div className="mx-auto max-w-[2400px]">
          {cameras.length === 0 ? (
            <div className="flex min-h-[56vh] flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <Camera className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold text-[#040415]">还没有可显示的监控画面</h3>
              <p className="mt-2 max-w-[360px] text-[13px] leading-relaxed text-gray-500">
                先添加摄像头并保存配置，再回到这里查看实时画面。
              </p>
              <button
                type="button"
                onClick={onOpenSettings}
                className="mt-5 rounded-[14px] bg-[#040415] px-5 py-3 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                添加摄像头
              </button>
            </div>
          ) : (
            <>
              <div
                className={`grid gap-3 md:gap-4 ${
                  layoutMode === 'single'
                    ? 'grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                }`}
              >
                {visibleCameras.map((camera) => (
                  <div
                    key={camera.id}
                    className={`overflow-hidden rounded-[20px] border border-gray-100 bg-black shadow-sm ${
                      layoutMode === 'single' ? 'h-[calc(100vh-190px)] min-h-[420px]' : 'aspect-video min-h-[220px]'
                    }`}
                  >
                    <CameraPlayer config={camera} />
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[18px] border border-gray-100 bg-white p-4 text-[12px] text-gray-500 shadow-sm">
                <ShieldCheck className="mr-1 inline h-4 w-4 text-[#334155]" />
                隐私模式开启的摄像头不会自动显示画面，需要手动点击“显示画面”。
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
