import { CheckCircle2, Circle, DatabaseBackup, Home, KeyRound, LayoutGrid, ScanLine, ShieldCheck } from 'lucide-react';

interface SetupGuidePanelProps {
  isConnected: boolean;
  hasToken: boolean;
  deviceCount: number;
  roomCount: number;
  isPro: boolean;
  onOpenConnection: () => void;
  onOpenDevices: () => void;
  onOpenRooms: () => void;
  onOpenBackup: () => void;
  onOpenLicense: () => void;
}

interface StepItem {
  title: string;
  description: string;
  done: boolean;
  action: string;
  onClick: () => void;
  icon: typeof KeyRound;
}

export function SetupGuidePanel({
  isConnected,
  hasToken,
  deviceCount,
  roomCount,
  isPro,
  onOpenConnection,
  onOpenDevices,
  onOpenRooms,
  onOpenBackup,
  onOpenLicense,
}: SetupGuidePanelProps) {
  const steps: StepItem[] = [
    {
      title: '连接 Home Assistant',
      description: hasToken ? (isConnected ? '连接正常，设备状态会实时同步。' : '已保存令牌，正在等待连接恢复。') : '首次使用需要填写 HA 长期访问令牌。',
      done: isConnected,
      action: '连接设置',
      onClick: onOpenConnection,
      icon: KeyRound,
    },
    {
      title: '扫描并选择设备',
      description: deviceCount > 0 ? `已添加 ${deviceCount} 个设备。` : '从 HA 实体中选择要展示的灯光、空调、窗帘和传感器。',
      done: deviceCount > 0,
      action: '设备管理',
      onClick: onOpenDevices,
      icon: ScanLine,
    },
    {
      title: '整理房间和常用',
      description: roomCount > 0 ? `已配置 ${roomCount} 个房间。` : '按真实家庭空间整理设备，让日常控制更顺手。',
      done: roomCount > 0,
      action: '房间管理',
      onClick: onOpenRooms,
      icon: Home,
    },
    {
      title: '创建交付备份',
      description: '部署完成后建议创建服务器备份，并下载一份本地备份。',
      done: false,
      action: '备份恢复',
      onClick: onOpenBackup,
      icon: DatabaseBackup,
    },
  ];

  return (
    <section className="mb-6 rounded-[22px] border border-gray-100 bg-white/90 p-4 text-[#040415] shadow-sm backdrop-blur-xl md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-[#334155]" />
            <h2 className="text-[17px] font-semibold">部署检查</h2>
          </div>
          <p className="mt-1 max-w-[720px] text-[13px] leading-relaxed text-gray-500">
            按顺序完成连接、设备、房间和备份，HAUI 就可以作为日常控制面板交付使用。
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenLicense}
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-[14px] bg-gray-100 px-4 text-[13px] font-semibold text-[#334155] transition-colors hover:bg-gray-200"
        >
          <ShieldCheck className="h-4 w-4" />
          {isPro ? '查看授权' : '高级功能'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="rounded-[18px] bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-white text-[#334155] shadow-sm">
                  <Icon className="h-4 w-4" />
                </div>
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                )}
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-[#040415]">{step.title}</h3>
              <p className="mt-1 min-h-[38px] text-[12px] leading-relaxed text-gray-500">{step.description}</p>
              <button
                type="button"
                onClick={step.onClick}
                className="mt-3 rounded-[12px] bg-white px-3 py-2 text-[12px] font-semibold text-[#334155] shadow-sm transition-colors hover:bg-gray-100"
              >
                {step.action}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
