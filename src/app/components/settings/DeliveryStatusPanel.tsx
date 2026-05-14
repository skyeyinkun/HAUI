import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Camera,
  CheckCircle2,
  DatabaseBackup,
  FileClock,
  Home,
  Info,
  KeyRound,
  Moon,
  RefreshCw,
  Router,
  ShieldCheck,
  TabletSmartphone,
  XCircle,
} from 'lucide-react';
import { Device } from '@/types/device';
import { Room } from '@/types/room';
import { HAConfig } from '@/types/home-assistant';
import { getLicenseEntitlements } from '@/features/license/license-policy';
import { getApiUrl, readApiError } from '@/utils/sync';
import { safeLocalStorage } from '@/utils/safe-storage';

type SettingsTabKey = 'connection' | 'devices' | 'users' | 'rooms' | 'cameras' | 'backup' | 'license';

interface SystemStatus {
  version?: string;
  frontendVersion?: string;
  addonVersion?: string;
  indexUpdatedAt?: string | null;
  serviceWorkerUpdatedAt?: string | null;
  cachePolicy?: string;
  host?: string;
}

interface DeliveryStatusPanelProps {
  isConnected: boolean;
  verifyStatus: 'idle' | 'success' | 'error';
  config: HAConfig;
  devices: Device[];
  rooms: Room[];
  cameras: HAConfig['cameras'];
  onOpenTab: (tab: SettingsTabKey) => void;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ok ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function DeliveryStatusPanel({
  isConnected,
  verifyStatus,
  config,
  devices,
  rooms,
  cameras,
  onOpenTab,
}: DeliveryStatusPanelProps) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [wallMode, setWallMode] = useState(() => {
    if (typeof window === 'undefined') return 'auto';
    return safeLocalStorage.getItem('haui_wall_mode') === '1'
      ? 'on'
      : safeLocalStorage.getItem('haui_wall_mode') === '0'
        ? 'off'
        : 'auto';
  });
  const entitlements = useMemo(() => getLicenseEntitlements(), []);

  const loadSystemStatus = async () => {
    try {
      setStatusError('');
      const res = await fetch(getApiUrl('/api/system/status'), { credentials: 'include' });
      if (!res.ok) throw new Error(await readApiError(res, '版本状态读取失败'));
      setSystemStatus(await res.json());
    } catch (error) {
      setSystemStatus(null);
      setStatusError(error instanceof Error ? error.message : '版本状态读取失败');
    }
  };

  useEffect(() => {
    void loadSystemStatus();
  }, []);

  const hasToken = Boolean(config.token && config.token.trim().length > 20);
  const cameraCount = cameras?.length || 0;
  const deliveryItems = [
    {
      title: 'HA 连接',
      description: isConnected ? '控制和状态同步正常。' : hasToken ? '已保存令牌，等待连接恢复。' : '需要先配置 Home Assistant 令牌。',
      ok: isConnected,
      action: '连接配置',
      tab: 'connection' as const,
      icon: Router,
    },
    {
      title: '设备面板',
      description: devices.length > 0 ? `已配置 ${devices.length} 个设备。` : '还没有添加日常控制设备。',
      ok: devices.length > 0,
      action: '设备管理',
      tab: 'devices' as const,
      icon: Home,
    },
    {
      title: '房间结构',
      description: rooms.length > 0 ? `已配置 ${rooms.length} 个房间。` : '建议按真实空间整理房间。',
      ok: rooms.length > 0,
      action: '房间管理',
      tab: 'rooms' as const,
      icon: TabletSmartphone,
    },
    {
      title: '监控画面',
      description: cameraCount > 0 ? `已配置 ${cameraCount} 路摄像头。` : '手机端监控入口需要至少一路摄像头。',
      ok: cameraCount > 0,
      action: '摄像头',
      tab: 'cameras' as const,
      icon: Camera,
    },
    {
      title: '授权状态',
      description: entitlements.isPro ? '系统已授权。' : '系统未授权，请先导入授权码。',
      ok: entitlements.isPro,
      action: '授权',
      tab: 'license' as const,
      icon: KeyRound,
    },
    {
      title: '备份恢复',
      description: '交付或更新前建议创建服务器备份并下载本地备份。',
      ok: false,
      action: '备份恢复',
      tab: 'backup' as const,
      icon: DatabaseBackup,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#334155]" />
                <h3 className="text-[18px] font-semibold text-[#040415]">交付状态</h3>
              </div>
              <p className="mt-1 max-w-[680px] text-[13px] leading-relaxed text-gray-500">
                用于部署后自检：连接、设备、房间、监控、授权和备份都完成后，再交给用户日常使用。
              </p>
            </div>
            <StatusBadge ok={isConnected && devices.length > 0 && rooms.length > 0} label={isConnected ? '可使用' : '待配置'} />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {deliveryItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-[18px] bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white text-[#334155] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    <StatusBadge ok={item.ok} label={item.ok ? '完成' : '待处理'} />
                  </div>
                  <h4 className="mt-3 text-[14px] font-semibold text-[#040415]">{item.title}</h4>
                  <p className="mt-1 min-h-[38px] text-[12px] leading-relaxed text-gray-500">{item.description}</p>
                  <button
                    type="button"
                    onClick={() => onOpenTab(item.tab)}
                    className="mt-3 rounded-[12px] bg-white px-3 py-2 text-[12px] font-semibold text-[#334155] shadow-sm transition-colors hover:bg-gray-100"
                  >
                    {item.action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileClock className="h-5 w-5 text-[#334155]" />
                <h4 className="text-[15px] font-semibold text-[#040415]">版本与缓存</h4>
              </div>
              <button
                type="button"
                onClick={() => void loadSystemStatus()}
                className="rounded-[12px] bg-gray-100 px-3 py-2 text-[12px] font-semibold text-[#334155] transition-colors hover:bg-gray-200"
              >
                <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
                刷新
              </button>
            </div>
            <div className="mt-4 space-y-2 text-[12px]">
              <div className="flex justify-between gap-3 rounded-[14px] bg-gray-50 px-3 py-2">
                <span className="text-gray-500">前端版本</span>
                <span className="font-semibold text-[#040415]">{systemStatus?.frontendVersion || import.meta.env.VITE_APP_VERSION || '未知'}</span>
              </div>
              <div className="flex justify-between gap-3 rounded-[14px] bg-gray-50 px-3 py-2">
                <span className="text-gray-500">Add-on 版本</span>
                <span className="font-semibold text-[#040415]">{systemStatus?.addonVersion || '未连接后端'}</span>
              </div>
              <div className="flex justify-between gap-3 rounded-[14px] bg-gray-50 px-3 py-2">
                <span className="text-gray-500">连接校验</span>
                <span className="font-semibold text-[#040415]">{verifyStatus === 'success' ? '通过' : verifyStatus === 'error' ? '失败' : '未验证'}</span>
              </div>
              {systemStatus?.indexUpdatedAt && (
                <div className="rounded-[14px] bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">前端文件更新时间</p>
                  <p className="mt-1 font-mono text-[#040415]">{new Date(systemStatus.indexUpdatedAt).toLocaleString()}</p>
                </div>
              )}
              {statusError && <p className="rounded-[14px] bg-amber-50 px-3 py-2 text-amber-700">{statusError}</p>}
            </div>
          </div>

          <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-[#334155]" />
              <h4 className="text-[15px] font-semibold text-[#040415]">平板墙屏</h4>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-gray-500">
              墙屏模式适合固定平板和大屏。建议配合系统夜间亮度、常亮和防误触设置使用。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-[16px] bg-gray-50 p-1">
              {[
                { key: 'auto', label: '自动' },
                { key: 'on', label: '开启' },
                { key: 'off', label: '关闭' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setWallMode(item.key);
                    if (item.key === 'auto') safeLocalStorage.removeItem('haui_wall_mode');
                    if (item.key === 'on') safeLocalStorage.setItem('haui_wall_mode', '1');
                    if (item.key === 'off') safeLocalStorage.setItem('haui_wall_mode', '0');
                    window.dispatchEvent(new Event('haui-wall-mode-change'));
                  }}
                  className={`rounded-[13px] px-3 py-2 text-[12px] font-semibold transition-colors ${
                    wallMode === item.key ? 'bg-white text-[#040415] shadow-sm' : 'text-gray-400 hover:text-[#334155]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-[12px] text-gray-500 sm:grid-cols-3">
              <div className="rounded-[14px] bg-gray-50 p-3">夜间降低亮度</div>
              <div className="rounded-[14px] bg-gray-50 p-3">定期切换画面</div>
              <div className="rounded-[14px] bg-gray-50 p-3">启用全屏常亮</div>
            </div>
          </div>

          <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[#334155]" />
              <h4 className="text-[15px] font-semibold text-[#040415]">交付边界</h4>
            </div>
            <div className="mt-4 space-y-3 text-[12px] leading-relaxed text-gray-500">
              <p>HAUI 是第三方面板，不代表 Home Assistant 官方背书。</p>
              <p>系统必须完成授权后才能进入使用。AI 成本、摄像头画面和 HA Token 默认保存在用户自己的环境中。</p>
              <p>AI 成本建议使用用户自己的 API Key；摄像头画面默认走本地代理、go2rtc 或厂商通道。</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-gray-50 p-3">
                <Bot className="h-4 w-4 text-[#334155]" />
                <p className="mt-2 text-[12px] font-semibold text-[#040415]">AI 成本隔离</p>
              </div>
              <div className="rounded-[14px] bg-gray-50 p-3">
                <ShieldCheck className="h-4 w-4 text-[#334155]" />
                <p className="mt-2 text-[12px] font-semibold text-[#040415]">隐私本地优先</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
