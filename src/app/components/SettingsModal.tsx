import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Save, Server, Link, User as UserIcon, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, ExternalLink, Check, Trash2, Plus, Layout, Upload, Image as ImageIcon, Video, Cpu, Users } from 'lucide-react';
import { toast } from 'sonner';
import { HAConfig } from '@/types/home-assistant';

import { Device } from '@/types/device';
import { User } from '@/types/user';
import { Room } from '@/types/room';
import { RoomManagementTab } from './settings/RoomManagementTab';
import { DeviceDiscoveryPanel } from './settings/DeviceDiscoveryPanel';
import { Scene } from '@/types/dashboard';
import { useSettingsWindowSize } from '@/hooks/useSettingsWindowSize';
import CameraConfigPanel from '@/app/components/dashboard/CameraConfigPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  users: User[];
  scenes: Scene[];
  rooms?: Room[];
  onUpdateUsers: (users: User[]) => void;
  onUpdateDevices?: (devices: Device[]) => void;
  onUpdateScenes?: (scenes: Scene[]) => void;
  onUpdateRooms?: (rooms: Room[]) => void;
  onSave: (config: HAConfig) => void;
  initialConfig: HAConfig;
  defaultTab?: string | null;
}

export default function SettingsModal({ isOpen, onClose, devices, users, scenes = [], rooms = [], onUpdateUsers, onUpdateDevices, onUpdateScenes, onUpdateRooms, onSave, initialConfig, defaultTab }: SettingsModalProps) {
  const windowSize = useSettingsWindowSize();
  const [activeTab, setActiveTab] = useState<'connection' | 'devices' | 'users' | 'rooms' | 'cameras'>('connection');
  const [config, setConfig] = useState<HAConfig>(initialConfig);

  const [showToken, setShowToken] = useState(false);
  const [showLocalUrl, setShowLocalUrl] = useState(false);
  const [showPublicUrl, setShowPublicUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const [localScenes, setLocalScenes] = useState(scenes);
  const [localDevices, setLocalDevices] = useState(devices);
  const [localRooms, setLocalRooms] = useState<Room[]>(rooms);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaved, setIsSaved] = useState(false);

  // 头像文件选择器的 ref 数组——每个用户对应一个，用于程序触发 input.click()
  const avatarInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 打开弹窗时，一次性完成初始化 + 立即使用 initialConfig.token 触发验证
  // 直接取 initialConfig 参数的值，避免 stale closure（config state 在同一渲染帧内不会更新）
  useEffect(() => {
    if (isOpen) {
      setLocalUsers(users);
      setLocalScenes(scenes);
      setLocalDevices(devices);
      setLocalRooms(rooms);
      setConfig(initialConfig);
      setVerifyStatus('idle');
      // 使用 initialConfig 而非 config，避免读到旧 state
      if (initialConfig.token && initialConfig.token.trim().length > 20) {
        runVerify(initialConfig.token, initialConfig.localUrl, initialConfig.publicUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // defaultTab 切换
  useEffect(() => {
    if (isOpen && defaultTab) {
      const validTabs = ['connection', 'devices', 'users', 'rooms', 'cameras'];
      if (validTabs.includes(defaultTab)) {
        setActiveTab(defaultTab as any);
      }
    }
  }, [isOpen, defaultTab]);

  const openUrl = (url: string) => {
    window.open(url, '_blank');
  };

  // 验证连接核心函数——支持三种场景：HA Ingress代理、用户配置的直连地址
  const runVerify = useCallback(async (token: string, localUrl?: string, publicUrl?: string) => {
    if (!token || token.length < 20) {
      setVerifyStatus('idle');
      return;
    }
    setIsVerifying(true);
    setVerifyStatus('idle');

    const authHeader = `Bearer ${token}`;

    // 场景1：通过本地 Node 代理（/ha-api → http://supervisor/core），HA Ingress 环境
    try {
      const res = await fetch('/ha-api/api/', {
        headers: { 'Authorization': authHeader },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok || res.status === 401) {
        // 200 = 成功；401 = 代理可达但 token 无效
        setVerifyStatus(res.ok ? 'success' : 'error');
        setIsVerifying(false);
        return;
      }
    } catch {
      // 代理不可达，继续尝试直连
    }

    // 场景2：用户配置的 HA 地址直连
    const configUrl = publicUrl || localUrl;
    if (configUrl) {
      const cleanUrl = configUrl
        .trim()
        .replace(/^wss?:\/\//, (m) => m.startsWith('wss') ? 'https://' : 'http://')
        .replace(/\/api\/websocket\/?$/, '')
        .replace(/\/api\/?$/, '')
        .replace(/\/$/, '');
      try {
        const res = await fetch(`${cleanUrl}/api/`, {
          headers: { 'Authorization': authHeader },
          signal: AbortSignal.timeout(5000),
        });
        setVerifyStatus(res.ok ? 'success' : 'error');
        setIsVerifying(false);
        return;
      } catch {
        // 直连也失败
      }
    }

    setVerifyStatus('error');
    setIsVerifying(false);
  }, []);

  // 监听 token / URL 变化，1s 防抖后自动重新验证
  useEffect(() => {
    if (!config.token) {
      setVerifyStatus('idle');
      return;
    }
    const timer = setTimeout(() => {
      runVerify(config.token, config.localUrl, config.publicUrl);
    }, 1000);
    return () => clearTimeout(timer);
  }, [config.token, config.localUrl, config.publicUrl, runVerify]);

  const handleSave = async () => {
    setIsSaving(true);
    setIsSaved(false);
    await new Promise(resolve => setTimeout(resolve, 600));
    onSave(config);
    if (onUpdateUsers) onUpdateUsers(localUsers);
    if (onUpdateScenes) onUpdateScenes(localScenes);
    if (onUpdateDevices) onUpdateDevices(localDevices);
    if (onUpdateRooms) onUpdateRooms(localRooms);
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[24px] w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-all duration-300" style={{ width: `${windowSize.width}px`, height: `${windowSize.height}px` }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg md:text-xl font-semibold text-[#040415]">系统设置</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-4 md:px-6 overflow-x-auto scrollbar-hide flex-shrink-0 gap-2 md:gap-4">
          <button
            onClick={() => setActiveTab('connection')}
            className={`py-3 md:py-4 px-2 md:px-4 font-medium text-xs md:text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'connection' ? 'text-[#040415]' : 'text-gray-400'}`}
          >
            <Link className="w-3.5 h-3.5" />
            连接配置
            {activeTab === 'connection' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#040415]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-3 md:py-4 px-2 md:px-4 font-medium text-xs md:text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'devices' ? 'text-[#040415]' : 'text-gray-400'}`}
          >
            <Cpu className="w-3.5 h-3.5" />
            设备管理
            {activeTab === 'devices' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#040415]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 md:py-4 px-2 md:px-4 font-medium text-xs md:text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'users' ? 'text-[#040415]' : 'text-gray-400'}`}
          >
            <Users className="w-3.5 h-3.5" />
            人员管理
            {activeTab === 'users' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#040415]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`py-3 md:py-4 px-2 md:px-4 font-medium text-xs md:text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'rooms' ? 'text-[#040415]' : 'text-gray-400'}`}
          >
            <Layout className="w-3.5 h-3.5" />
            房间管理
            {activeTab === 'rooms' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#040415]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cameras')}
            className={`py-3 md:py-4 px-2 md:px-4 font-medium text-xs md:text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'cameras' ? 'text-[#040415]' : 'text-gray-400'}`}
          >
            <Video className="w-3.5 h-3.5" />
            摄像头管理
            {activeTab === 'cameras' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#040415]" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/50">
          {activeTab === 'connection' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    HA 局域网地址
                  </label>
                  <div className="relative">
                    <input
                      type={showLocalUrl ? "text" : "password"}
                      placeholder="http://192.168.1.x:8123"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all pr-20"
                      value={config.localUrl}
                      onChange={(e) => setConfig({ ...config, localUrl: e.target.value })}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button type="button" onClick={() => setShowLocalUrl(!showLocalUrl)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        {showLocalUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {config.localUrl && (
                        <button onClick={() => openUrl(config.localUrl)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors" title="访问地址">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    HA 公网访问地址
                  </label>
                  <div className="relative">
                    <input
                      type={showPublicUrl ? "text" : "password"}
                      placeholder="https://your-ha-instance.ui.nabu.casa"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all pr-20"
                      value={config.publicUrl}
                      onChange={(e) => setConfig({ ...config, publicUrl: e.target.value })}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button type="button" onClick={() => setShowPublicUrl(!showPublicUrl)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        {showPublicUrl ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {config.publicUrl && (
                        <button onClick={() => openUrl(config.publicUrl)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors" title="访问地址">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    长期访问令牌 (Long-lived Access Token)
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        type={showToken ? "text" : "password"}
                        placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
                        className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-mono text-sm"
                        value={config.token}
                        onChange={(e) => setConfig({ ...config, token: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      {isVerifying ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      ) : verifyStatus === 'success' ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : verifyStatus === 'error' ? (
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">令牌将加密存储在本地浏览器中，用于连接 Home Assistant。输入后自动验证。</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <DeviceDiscoveryPanel devices={localDevices} onUpdateDevices={setLocalDevices} haConfig={config} onUpdateConfig={setConfig} rooms={localRooms.map(r => r.name)} />
          )}

          {activeTab === 'users' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-medium text-sm text-gray-700 flex justify-between items-center">
                    <span>人员列表</span>
                    {/* 新增人员按钮 */}
                    <button
                      onClick={() => {
                        // 追加一条空白人员
                        const newUser = { name: `成员${localUsers.length + 1}`, avatar: '', online: false };
                        setLocalUsers(prev => [...prev, newUser]);
                      }}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      手动添加
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {localUsers.map((user, index) => (
                      <div key={index} className="p-4 flex items-center justify-between gap-3">

                        {/* 头像区域：使用 ref.click() 程序触发，彻底解决 hidden input 跨浏览器兼容问题 */}
                        <div
                          className="relative w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0 group"
                          title="点击上传本地头像"
                          onClick={() => avatarInputRefs.current[index]?.click()}
                        >
                          {user.avatar
                            ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            : <UserIcon className="w-6 h-6 text-gray-400" />}
                          {/* 悬浮蒙版提示 */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        {/* 隐藏 input 独立于 div 之外，避免 label/hidden 兼容性问题 */}
                        <input
                          ref={el => { avatarInputRefs.current[index] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            // 限制图片大小 ≤ 2MB
                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('图片大小不能超过 2MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const base64 = ev.target?.result as string;
                              setLocalUsers(prev =>
                                prev.map((u, i) => i === index ? { ...u, avatar: base64 } : u)
                              );
                            };
                            reader.readAsDataURL(file);
                            // 重置 input，允许重复选同一个文件
                            e.target.value = '';
                          }}
                        />

                        {/* 名称编辑框 */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={user.name}
                            onChange={(e) => setLocalUsers(prev =>
                              prev.map((u, i) => i === index ? { ...u, name: e.target.value } : u)
                            )}
                            className="w-full font-medium text-gray-900 text-sm border border-transparent rounded-lg px-2 py-1 focus:border-blue-300 focus:ring-1 focus:ring-blue-100 outline-none transition-all bg-transparent hover:bg-gray-50"
                            placeholder="成员名称"
                          />
                          <div className="text-xs text-gray-400 px-2">
                            {user.online ? '🟢 在线' : '⚫ 离线'}
                            {user.avatar && user.avatar.startsWith('data:') && (
                              <span className="ml-2 text-green-500">· 本地头像</span>
                            )}
                          </div>
                        </div>

                        {/* 清除头像 + 删除成员 */}
                        <div className="flex items-center gap-1 shrink-0">
                          {user.avatar && user.avatar.startsWith('data:') && (
                            <button
                              onClick={() => setLocalUsers(prev =>
                                prev.map((u, i) => i === index ? { ...u, avatar: '' } : u)
                              )}
                              className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors"
                              title="清除本地头像（恢复 HA 头像）"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setLocalUsers(prev => prev.filter((_, i) => i !== index))}
                            className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            title="删除此人员"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {localUsers.length === 0 && (
                      <div className="p-8 text-center text-gray-400 text-sm">
                        暂无人员。可点击右上角「手动添加」，或在连接 HA 后自动从 Person 实体同步。
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  头像支持上传本地图片（≤2MB）或从 Home Assistant Person 实体自动同步。
                  修改后点击底部「保存配置」生效。
                </p>
              </div>
            </div>
          )}
          {activeTab === 'rooms' && <RoomManagementTab rooms={localRooms} onUpdateRooms={setLocalRooms} />}
          {activeTab === 'cameras' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 md:px-6 pt-4 pb-2 border-b border-gray-100 shrink-0">
                <h3 className="text-sm font-semibold text-gray-900">摄像头管理</h3>
                <p className="text-xs text-gray-500 mt-0.5">支持 RTSP · ONVIF · Home Assistant · 萤石云 · Aqara 绿米</p>
              </div>
              <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
                <CameraConfigPanel onConfigChange={() => { }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          {activeTab === 'cameras' ? (
            /* 摄像头 tab：配置独立保存到 localStorage，无需点此按钮 */
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-400">
              <Video className="w-4 h-4 shrink-0" />
              摄像头配置已独立保存，无需点击此处
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`w-full text-white py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${isSaved ? 'bg-green-500 hover:bg-green-600' : 'bg-[#040415] hover:opacity-90'}`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {isSaving ? '保存中...' : isSaved ? '保存成功' : '保存配置'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
