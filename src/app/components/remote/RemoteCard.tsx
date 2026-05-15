import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Device } from '@/types/device';
import type { LucideIcon } from 'lucide-react';
import { createRemoteInputController, RemoteKeyCode } from '@/utils/remote-input';
import { cn } from '@/app/components/ui/utils';
import { ICON_PROPS, ICON_SIZES, ICON_STROKE_WIDTH } from '@/styles/icon-constants';
import { safeLocalStorage } from '@/utils/safe-storage';
import { LUCIDE_ICON_MAP, getLucideIcon } from '@/utils/lucide-icon-map';
import './RemoteCard.css';

interface RemoteCardProps {
  device: Device;
  onClick: () => void;
  sendIR: (code: string) => void;
  isEditing?: boolean;
  isCommon?: boolean;
  onToggleCommon?: (e: React.MouseEvent) => void;
}

import type { RemoteProfile } from '@/types/remote';
type RemoteMappings = Record<string, { entity_id?: string; display_text?: string; icon?: string }>;

// 遥控器设备配置文件
const PROFILES: Array<{ id: RemoteProfile; label: string; icon: LucideIcon; configId: string }> = [
  { id: 'tv', label: 'TV', icon: LUCIDE_ICON_MAP.Tv, configId: 'profile_tv' },
  { id: 'stb', label: '机顶盒', icon: LUCIDE_ICON_MAP.LayoutGrid, configId: 'profile_stb' },
  { id: 'speaker', label: '音响', icon: LUCIDE_ICON_MAP.Speaker, configId: 'profile_speaker' },
];

// 根据 profile 获取设备类型名称
const getProfileLabel = (profile: RemoteProfile): string => {
  const profileMap: Record<RemoteProfile, string> = {
    tv: '电视',
    stb: '机顶盒',
    speaker: '音响'
  };
  return profileMap[profile] || '遥控器';
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

export default function RemoteCard({ device, onClick, sendIR, isEditing, isCommon, onToggleCommon }: RemoteCardProps) {
  const [activeProfile, setActiveProfile] = useState<RemoteProfile>(() => {
    if (typeof window === 'undefined') return 'tv';
    const saved = safeLocalStorage.getItem(`remote_profile_${device.id}`);
    if (saved === 'tv' || saved === 'stb' || saved === 'speaker') return saved;
    return 'tv';
  });

  const [mappings, setMappings] = useState<RemoteMappings>({});
  const [globalMappings, setGlobalMappings] = useState<RemoteMappings>({});

  // 加载全局和配置文件特定的映射
  useEffect(() => {
    const saved = safeLocalStorage.getItem(`remote_profile_${device.id}`);
    if (saved === 'tv' || saved === 'stb' || saved === 'speaker') setActiveProfile(saved);
  }, [device.id]);

  useEffect(() => {
    const loadGlobal = () => {
      const saved = safeLocalStorage.getItem(`remote_global_${device.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') setGlobalMappings(parsed);
          else setGlobalMappings({});
        } catch { setGlobalMappings({}); }
      } else { setGlobalMappings({}); }
    };
    loadGlobal();
    window.addEventListener('remote-config-update', loadGlobal);
    return () => window.removeEventListener('remote-config-update', loadGlobal);
  }, [device.id]);

  useEffect(() => {
    const loadMappings = () => {
      const savedMap = safeLocalStorage.getItem(`remote_map_${device.id}_${activeProfile}`);
      if (savedMap) {
        try {
          const parsed = JSON.parse(savedMap);
          if (parsed && typeof parsed === 'object') { setMappings(parsed); return; }
        } catch { /* 忽略 */ }
      }
      setMappings({});
    };
    loadMappings();
    window.addEventListener('storage', loadMappings);
    window.addEventListener('remote-config-update', loadMappings);
    return () => {
      window.removeEventListener('storage', loadMappings);
      window.removeEventListener('remote-config-update', loadMappings);
    };
  }, [device.id, activeProfile]);

  useEffect(() => {
    safeLocalStorage.setItem(`remote_profile_${device.id}`, activeProfile);
  }, [activeProfile, device.id]);

  // 获取显示文本和图标的工具函数
  const getDisplayText = (id: string, fallback: string) => {
    const map = id.startsWith('profile_') ? globalMappings : mappings;
    const t = map?.[id]?.display_text;
    return t && t.trim() ? t : fallback;
  };

  const getIcon = (id: string, FallbackIcon: any) => {
    const map = id.startsWith('profile_') ? globalMappings : mappings;
    const iconName = map?.[id]?.icon;
    if (iconName && iconName.trim()) {
      return getLucideIcon(iconName, 'Circle');
    }
    return FallbackIcon || LUCIDE_ICON_MAP.Circle;
  };

  // 红外发射控制器
  const controller = useMemo(() => {
    return createRemoteInputController({
      send: (code: RemoteKeyCode | string) => {
        if (isEditing) return;
        sendIR(`${activeProfile}_${code}`);
      },
      minIntervalMs: 15,
    });
  }, [isEditing, sendIR, activeProfile]);

  const keyProps = useCallback((code: string) => {
    return controller.handlersFor(code as RemoteKeyCode);
  }, [controller]);

  // 通用圆形按钮组件
  const RoundBtn = ({ code, icon: Icon, label, size = 'normal', className = '' }: {
    code: string; icon: LucideIcon; label: string;
    size?: 'normal' | 'small'; className?: string;
  }) => (
    <button
      type="button"
      data-testid={`ir-${code}`}
      aria-label={label}
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-150",
        "bg-muted/30 border border-white/5 text-muted-foreground",
        "hover:text-foreground hover:bg-muted/60",
        "active:scale-95 active:text-green-500 active:bg-green-500/10",
        size === 'small' ? 'w-[24px] h-[24px]' : 'w-[28px] h-[28px]',
        className
      )}
      {...keyProps(code)}
    >
      <Icon 
        className="shrink-0 text-foreground/70" 
        style={{ 
          width: size === 'small' ? ICON_SIZES.common.xs : ICON_SIZES.remote.button,
          height: size === 'small' ? ICON_SIZES.common.xs : ICON_SIZES.remote.button,
          strokeWidth: ICON_STROKE_WIDTH.thin,
        }} 
      />
    </button>
  );

  return (
    <div
      className={cn(
        "relative aspect-square rounded-[20px] shadow-sm overflow-hidden transition-all duration-200 flex flex-col bg-card border border-border/50",
        isEditing ? 'cursor-default ring-2 ring-primary/20 scale-[0.98]' : 'hover:scale-[1.02] hover:shadow-md cursor-pointer',
        "remote-card"
      )}
      onClick={!isEditing ? onClick : undefined}
    >
      {/* 编辑模式叠加层 */}
      {isEditing && (
        <div
          className="absolute right-0 top-0 z-50 p-2 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onToggleCommon?.(e); }}
        >
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors border border-white/10",
            isCommon ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          )}>
            {isCommon ? <XIcon className="w-3.5 h-3.5" /> : <LUCIDE_ICON_MAP.Plus className="w-4 h-4" />}
          </div>
        </div>
      )}

      {/* ===== 主内容区 ===== */}
      <div className="relative z-10 flex flex-col h-full p-2 gap-1 justify-between">

        {/* 1. 顶部：电源(状态) + 标题 + 配置文件切换 */}
        <div className="flex items-center justify-between min-h-[32px] shrink-0 gap-2 px-0.5">

          {/* 左侧：电源开关 - 根据当前profile发送对应设备的电源指令 */}
          <button
            type="button"
            data-testid="ir-power"
            aria-label={`${activeProfile === 'tv' ? '电视' : activeProfile === 'stb' ? '机顶盒' : '音响'}电源`}
            className={cn(
              "flex items-center gap-2 overflow-hidden group outline-none min-w-0 flex-1",
              isEditing ? 'cursor-default' : 'cursor-pointer'
            )}
            onClick={(_e) => {
              if (isEditing) return;
              // 根据当前profile发送对应的电源指令
              sendIR(`${activeProfile}_power`);
            }}
          >
            {/* 电源图标容器，与其他设备卡片 DeviceIcon 尺寸对齐 (32px) */}
            {/* 遥控器按钮统一为白色图标，单次触发，无状态反馈 */}
            <div className={cn(
              "w-[32px] h-[32px] shrink-0 rounded-[12px] flex items-center justify-center border transition-all duration-300",
              "bg-neutral-800 border-white/5 text-white group-hover:bg-neutral-700"
            )}>
              <LUCIDE_ICON_MAP.Power {...ICON_PROPS.remotePower} />
            </div>

            {/* 标题区域，根据当前 profile 显示对应的设备类型名称 */}
            <div className="flex flex-col items-start justify-center min-w-0">
              <h3 className="font-['SF_Pro_Display',sans-serif] text-[14px] font-medium leading-tight text-foreground truncate w-full">
                {getProfileLabel(activeProfile)}
              </h3>
              {/* 遥控器无状态反馈，不显示开启/关闭状态 */}
            </div>
          </button>

          {/* 右侧：配置文件切换 */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5 h-6 border border-white/5 shrink-0">
            {PROFILES.map((p) => {
              const Icon = getIcon(p.configId, p.icon);
              const isActive = activeProfile === p.id;
              return (
                <button
                  key={p.id}
                  onClick={(e) => { e.stopPropagation(); setActiveProfile(p.id); }}
                  aria-label={`切换到${getDisplayText(p.configId, p.label)}`}
                  aria-pressed={isActive}
                  className={cn(
                    "h-full px-1 flex items-center justify-center rounded-[5px] transition-all",
                    isActive
                      ? 'bg-background shadow-sm text-foreground ring-1 ring-black/5 dark:ring-white/5'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={getDisplayText(p.configId, p.label)}
                >
                  <Icon 
                    className="shrink-0 text-current" 
                    style={{ 
                      width: ICON_SIZES.remote.profile,
                      height: ICON_SIZES.remote.profile,
                      strokeWidth: ICON_STROKE_WIDTH.thin,
                    }} 
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 核心操控区：调整间距，利用释放出来的底部空间 */}
        <div className="flex-1 grid grid-cols-[26px_1fr_26px] gap-1.5 items-center content-center px-0.5 min-h-0">

          {/* ===== 左列：音量 ===== */}
          <div className="flex flex-col items-center justify-center gap-1.5 h-full">
            <RoundBtn code="vol_up" icon={LUCIDE_ICON_MAP.Plus} label="音量+" className="w-6.5 h-6.5" />
            <RoundBtn code="mute" icon={LUCIDE_ICON_MAP.VolumeX} label="静音" className="w-6.5 h-6.5" />
            <RoundBtn code="vol_down" icon={LUCIDE_ICON_MAP.Minus} label="音量-" className="w-6.5 h-6.5" />
          </div>

          {/* ===== 中列：D-Pad ===== */}
          <div className="flex items-center justify-center h-full">
            <div className="relative w-[68px] h-[68px] shrink-0 rounded-full bg-accent/20 shadow-inner ring-1 ring-white/5">
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {/* 上 */}
                <button
                  aria-label="上"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 flex justify-center pt-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0)' }}
                  {...keyProps('up')}
                >
                  <LUCIDE_ICON_MAP.ChevronUp {...ICON_PROPS.remoteDpad} />
                </button>
                {/* 右 */}
                <button
                  aria-label="右"
                  className="absolute top-1/2 right-0 -translate-y-1/2 h-full w-1/2 flex items-center justify-end pr-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(0 50%, 100% 0, 100% 100%)' }}
                  {...keyProps('right')}
                >
                  <LUCIDE_ICON_MAP.ChevronRight {...ICON_PROPS.remoteDpad} />
                </button>
                {/* 下 */}
                <button
                  aria-label="下"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 flex justify-center items-end pb-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%)' }}
                  {...keyProps('down')}
                >
                  <LUCIDE_ICON_MAP.ChevronDown {...ICON_PROPS.remoteDpad} />
                </button>
                {/* 左 */}
                <button
                  aria-label="左"
                  className="absolute top-1/2 left-0 -translate-y-1/2 h-full w-1/2 flex items-center justify-start pl-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(100% 50%, 0 100%, 0 0)' }}
                  {...keyProps('left')}
                >
                  <LUCIDE_ICON_MAP.ChevronLeft {...ICON_PROPS.remoteDpad} />
                </button>
              </div>

              {/* 中心OK */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                  aria-label="确认"
                  className="w-[22px] h-[22px] rounded-full bg-background shadow-md border border-white/5 flex items-center justify-center pointer-events-auto hover:bg-accent hover:scale-105 active:scale-95 active:border-green-500 transition-all z-10"
                  {...keyProps('ok')}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/30" />
                </button>
              </div>
            </div>
          </div>

          {/* ===== 右列：导航键 ===== */}
          <div className="flex flex-col items-center justify-center gap-1.5 h-full">
            <RoundBtn code="menu" icon={LUCIDE_ICON_MAP.Menu} label="菜单" className="w-6.5 h-6.5" />
            <RoundBtn code="home" icon={LUCIDE_ICON_MAP.Home} label="主页" className="w-6.5 h-6.5" />
            <RoundBtn code="back" icon={LUCIDE_ICON_MAP.Undo2} label="返回" className="w-6.5 h-6.5" />
          </div>
        </div>

      </div>
    </div>
  );
}

