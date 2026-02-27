import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Device } from '@/types/device';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Plus, Minus, Power, VolumeX, Volume2,
  Home, Menu, Undo2, Circle
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { createRemoteInputController, RemoteKeyCode } from '@/utils/remote-input';
import { cn } from '@/app/components/ui/utils';
import './RemoteCard.css';

interface RemoteCardProps {
  device: Device;
  onClick: () => void;
  sendIR: (code: string) => void;
  isEditing?: boolean;
  isCommon?: boolean;
  onToggleCommon?: (e: React.MouseEvent) => void;
}

type RemoteProfile = 'tv' | 'stb' | 'speaker';
type RemoteMappings = Record<string, { entity_id?: string; display_text?: string; icon?: string }>;

// 遥控器设备配置文件
const PROFILES: Array<{ id: RemoteProfile; label: string; icon: React.ComponentType<{ className?: string }>; configId: string }> = [
  { id: 'tv', label: 'TV', icon: Icons.Tv, configId: 'profile_tv' },
  { id: 'stb', label: '机顶盒', icon: Icons.LayoutGrid, configId: 'profile_stb' },
  { id: 'speaker', label: '音响', icon: Icons.Speaker, configId: 'profile_speaker' },
];

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
    const saved = localStorage.getItem(`remote_profile_${device.id}`);
    if (saved === 'tv' || saved === 'stb' || saved === 'speaker') return saved;
    return 'tv';
  });

  const [mappings, setMappings] = useState<RemoteMappings>({});
  const [globalMappings, setGlobalMappings] = useState<RemoteMappings>({});

  // 加载全局和配置文件特定的映射
  useEffect(() => {
    const saved = localStorage.getItem(`remote_profile_${device.id}`);
    if (saved === 'tv' || saved === 'stb' || saved === 'speaker') setActiveProfile(saved);
  }, [device.id]);

  useEffect(() => {
    const loadGlobal = () => {
      const saved = localStorage.getItem(`remote_global_${device.id}`);
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
      const savedMap = localStorage.getItem(`remote_map_${device.id}_${activeProfile}`);
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
    localStorage.setItem(`remote_profile_${device.id}`, activeProfile);
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
      const Icon = Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
      if (Icon) return Icon;
    }
    return FallbackIcon || Circle;
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
    code: string; icon: React.ComponentType<{ className?: string }>; label: string;
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
      <Icon className={size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
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
            {isCommon ? <XIcon className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
          </div>
        </div>
      )}

      {/* ===== 主内容区 ===== */}
      <div className="relative z-10 flex flex-col h-full p-2 gap-1 justify-between">

        {/* 1. 顶部：电源(状态) + 标题 + 配置文件切换 */}
        <div className="flex items-center justify-between min-h-[28px] shrink-0 gap-1.5 px-0.5">

          {/* 左侧：电源开关 (整合状态显示) */}
          <button
            type="button"
            data-testid="ir-power"
            aria-label="电源"
            className={cn(
              "flex items-center gap-1.5 overflow-hidden group outline-none min-w-0 flex-1",
              isEditing ? 'cursor-default' : 'cursor-pointer'
            )}
            onClick={(e) => {
              if (isEditing) return;
              keyProps('power').onClick?.(e);
            }}
          >
            <div className={cn(
              "w-6.5 h-6.5 shrink-0 rounded-lg flex items-center justify-center border transition-all duration-300",
              device.isOn
                ? "bg-green-500/10 border-green-500/30 text-green-500 shadow-[0_0_8px_rgba(34,197,94,0.1)]"
                : "bg-neutral-800 border-white/5 text-muted-foreground group-hover:text-foreground"
            )}>
              <Power className="w-3 h-3" />
            </div>

            <div className="flex flex-col items-start justify-center min-w-0">
              <h3 className="text-[10px] font-bold leading-none text-foreground/90 tracking-tight truncate w-full">遥控器</h3>
              <span className="text-[8px] font-medium text-muted-foreground/60 leading-tight scale-90 origin-left mt-0.5">
                {device.isOn ? '已开启' : '已关闭'}
              </span>
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
                  className={cn(
                    "h-full px-1 flex items-center justify-center rounded-[5px] transition-all",
                    isActive
                      ? 'bg-background shadow-sm text-foreground ring-1 ring-black/5 dark:ring-white/5'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title={getDisplayText(p.configId, p.label)}
                >
                  <Icon className="w-2.5 h-2.5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 核心操控区：调整间距，利用释放出来的底部空间 */}
        <div className="flex-1 grid grid-cols-[26px_1fr_26px] gap-1.5 items-center content-center px-0.5 min-h-0">

          {/* ===== 左列：音量 ===== */}
          <div className="flex flex-col items-center justify-center gap-1.5 h-full">
            <RoundBtn code="vol_up" icon={Plus} label="音量+" className="w-6.5 h-6.5" />
            <RoundBtn code="mute" icon={VolumeX} label="静音" className="w-6.5 h-6.5" />
            <RoundBtn code="vol_down" icon={Minus} label="音量-" className="w-6.5 h-6.5" />
          </div>

          {/* ===== 中列：D-Pad ===== */}
          <div className="flex items-center justify-center h-full">
            <div className="relative w-[68px] h-[68px] shrink-0 rounded-full bg-accent/20 shadow-inner ring-1 ring-white/5">
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {/* 上 */}
                <button
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 flex justify-center pt-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(50% 50%, 0 0, 100% 0)' }}
                  {...keyProps('up')}
                >
                  <ChevronUp className="w-3 h-3 text-foreground/70" />
                </button>
                {/* 右 */}
                <button
                  className="absolute top-1/2 right-0 -translate-y-1/2 h-full w-1/2 flex items-center justify-end pr-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(0 50%, 100% 0, 100% 100%)' }}
                  {...keyProps('right')}
                >
                  <ChevronRight className="w-3 h-3 text-foreground/70" />
                </button>
                {/* 下 */}
                <button
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/2 flex justify-center items-end pb-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%)' }}
                  {...keyProps('down')}
                >
                  <ChevronDown className="w-3 h-3 text-foreground/70" />
                </button>
                {/* 左 */}
                <button
                  className="absolute top-1/2 left-0 -translate-y-1/2 h-full w-1/2 flex items-center justify-start pl-1 hover:bg-white/5 active:bg-white/10 active:text-green-400 transition-colors"
                  style={{ clipPath: 'polygon(100% 50%, 0 100%, 0 0)' }}
                  {...keyProps('left')}
                >
                  <ChevronLeft className="w-3 h-3 text-foreground/70" />
                </button>
              </div>

              {/* 中心OK */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
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
            <RoundBtn code="menu" icon={Menu} label="菜单" className="w-6.5 h-6.5" />
            <RoundBtn code="home" icon={Home} label="主页" className="w-6.5 h-6.5" />
            <RoundBtn code="back" icon={Undo2} label="返回" className="w-6.5 h-6.5" />
          </div>
        </div>

      </div>
    </div>
  );
}

