import { useState } from 'react';
import { Plus, Trash2, X, Camera, Settings2, Globe, ShieldCheck } from 'lucide-react';
import { CameraConfig } from '@/components/camera/types';
import { toast } from 'sonner';

interface CameraManagementTabProps {
  cameras: CameraConfig[];
  onUpdateCameras: (cameras: CameraConfig[]) => void;
}

export function CameraManagementTab({ cameras, onUpdateCameras }: CameraManagementTabProps) {
  const [cameraDeleteId, setCameraDeleteId] = useState<string | null>(null);

  const handleAddCamera = () => {
    const newCamera: CameraConfig = {
      id: crypto.randomUUID(),
      name: `新摄像头 ${cameras.length + 1}`,
      type: 'ha-hls',
      url: ''
    };
    onUpdateCameras([...cameras, newCamera]);
    toast.success('已添加新摄像头，请完善配置信息');
  };

  const handleUpdateCamera = (id: string, updates: Partial<CameraConfig>) => {
    const updated = cameras.map(cam => 
      cam.id === id ? { ...cam, ...updates } : cam
    );
    onUpdateCameras(updated);
  };

  const handleDelete = (id: string) => {
    onUpdateCameras(cameras.filter(cam => cam.id !== id));
    setCameraDeleteId(null);
    toast.success('已移除摄像头');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-gray-50/30">
      <div className="space-y-6 max-w-4xl mx-auto">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-[20px] font-bold text-[#040415] tracking-tight flex items-center gap-2">
              <Camera className="w-5 h-5" />
              摄像头管理
            </h3>
            <p className="text-[12px] text-gray-500 mt-1">配置全屋监控，支持 Home Assistant HLS 代理及萤石云 Ezviz 直连</p>
          </div>
          <button
            onClick={handleAddCamera}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#040415] text-white rounded-[14px] text-[13px] font-bold hover:opacity-90 transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            添加摄像头
          </button>
        </div>

        {/* Camera List */}
        <div className="space-y-4 pb-8">
          {cameras.map((camera) => (
            <div
              key={camera.id}
              className="group bg-white rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              <div className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Icon & Type Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                       <input
                        type="text"
                        value={camera.name}
                        onChange={(e) => handleUpdateCamera(camera.id, { name: e.target.value })}
                        className="font-bold text-[15px] text-[#040415] bg-transparent border-none p-0 focus:ring-0 outline-none w-full md:w-48"
                        placeholder="输入摄像头名称"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={camera.type}
                          onChange={(e) => handleUpdateCamera(camera.id, { type: e.target.value as any })}
                          className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border-none focus:ring-1 focus:ring-blue-200 outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                        >
                          <option value="ha-hls">HA (HLS)</option>
                          <option value="ezviz">萤石 (Ezviz)</option>
                          <option value="rtsp">RTSP (go2rtc)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Config Inputs */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                    {/* RTSP 模式：显示 go2rtc 服务地址和流名称 */}
                    {camera.type === 'rtsp' ? (
                      <>
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Globe className="w-3 h-3" />
                            go2rtc 服务地址
                          </label>
                          <input
                            type="text"
                            value={camera.go2rtcUrl || ''}
                            onChange={(e) => handleUpdateCamera(camera.id, { go2rtcUrl: e.target.value })}
                            className="w-full text-[13px] bg-gray-50 border border-transparent focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 rounded-xl px-3 py-2 outline-none transition-all font-mono"
                            placeholder="http://192.168.1.100:1984"
                          />
                        </div>
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Settings2 className="w-3 h-3" />
                            流名称 (Stream Name)
                          </label>
                          <input
                            type="text"
                            value={camera.streamName || ''}
                            onChange={(e) => handleUpdateCamera(camera.id, { streamName: e.target.value })}
                            className="w-full text-[13px] bg-gray-50 border border-transparent focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 rounded-xl px-3 py-2 outline-none transition-all font-mono"
                            placeholder="front_door"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Globe className="w-3 h-3" />
                            流媒体地址 (URL)
                          </label>
                          <input
                            type="text"
                            value={camera.url || ''}
                            onChange={(e) => handleUpdateCamera(camera.id, { url: e.target.value })}
                            className="w-full text-[13px] bg-gray-50 border border-transparent focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 rounded-xl px-3 py-2 outline-none transition-all font-mono"
                            placeholder={camera.type === 'ezviz' ? 'ezopen://open.ys7.com/...' : '/api/hls/camera_entity.m3u8'}
                          />
                        </div>
                        {camera.type === 'ezviz' && (
                          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3 h-3" />
                              访问令牌 (Token)
                            </label>
                            <input
                              type="password"
                              value={camera.accessToken || ''}
                              onChange={(e) => handleUpdateCamera(camera.id, { accessToken: e.target.value })}
                              className="w-full text-[13px] bg-gray-50 border border-transparent focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50/50 rounded-xl px-3 py-2 outline-none transition-all font-mono"
                              placeholder="Ezviz Access Token"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end shrink-0 pl-2">
                    {cameraDeleteId === camera.id ? (
                      <div className="flex items-center gap-1 animate-in zoom-in-95">
                        <button
                          onClick={() => handleDelete(camera.id)}
                          className="px-3 py-1.5 bg-red-500 text-white text-[12px] font-bold rounded-xl hover:bg-red-600 shadow-sm transition-colors"
                        >
                          确认删除
                        </button>
                        <button
                          onClick={() => setCameraDeleteId(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCameraDeleteId(camera.id)}
                        className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-40 group-hover:opacity-100 focus:opacity-100"
                        title="删除摄像头"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {cameras.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[32px] border-2 border-dashed border-gray-100">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-gray-200" />
              </div>
              <h3 className="text-[16px] font-bold text-text-heading">暂无摄像头</h3>
              <p className="text-[13px] text-gray-400 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                点击上方“添加摄像头”开始配置您的全屋智能监控
              </p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50/50 rounded-[24px] p-5 border border-blue-50">
          <h4 className="text-[13px] font-bold text-blue-900 flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            配置指南
          </h4>
          <ul className="mt-3 space-y-2 text-[12px] text-blue-700/80 leading-relaxed">
            <li>• <b>HA (HLS):</b> 请输入由 HA 代理下发的摄像头流地址，通常以 <code className="bg-white/60 px-1 rounded">/api/hls/</code> 开头。</li>
            <li>• <b>萤石 (Ezviz):</b> 请使用 <code className="bg-white/60 px-1 rounded">ezopen://</code> 协议地址，并确保输入有效的 Access Token。</li>
            <li>• <b>RTSP (go2rtc):</b> 填入 go2rtc 服务地址和流名称，系统将优先使用 WebRTC 低延迟连接，失败时自动回退到 HLS。</li>
            <li>• 配置完成后，您可以在首页添加“摄像头组件”并选择此处配置的监控画面。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
