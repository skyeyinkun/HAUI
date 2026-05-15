import React from 'react';
import { X, Fan, DoorOpen, Droplet, UserRound } from 'lucide-react';
import svgPaths from "@/imports/svg-vz3fosb0v5";
import imgToggleSwitch from "@/assets/toggle_switch.png";
import { Device } from '@/types/device';
import { CustomIcon } from './shared/CustomIcon';
import { SensorTimestamp } from '@/app/components/dashboard/SensorTimestamp';

// 重导出空调控制共享配置与图标
export {
  HVAC_MODE_CONFIG,
  FAN_MODE_CONFIG,
  SWING_MODE_LABELS,
  DEFAULT_HVAC_MODES,
  DEFAULT_FAN_MODES,
  FanLevelIcon,
  FanModeIcon,
} from './shared/ClimateShared';

// ----------------------------------------------------------------------
// Shared Types
// ----------------------------------------------------------------------

export interface DeviceCardWrapperProps {
  children: React.ReactNode;
  className?: string;
  onClick: (e: React.MouseEvent) => void;
  device: Device;
  isEditing?: boolean;
  isCommon?: boolean;
  onToggleCommon?: (e: React.MouseEvent) => void;
}

export interface DeviceCardHeaderProps {
  device: Device;
  onToggle: (e: React.MouseEvent) => void;
  value?: number;
}

// ----------------------------------------------------------------------
// Helper Components
// ----------------------------------------------------------------------

export function StatusDot({ isOn }: { isOn: boolean }) {
  return (
    <div className={`w-2.5 h-2.5 rounded-full ${isOn ? 'bg-success' : 'bg-black/10 dark:bg-white/10'}`} />
  );
}

export function SquareToggle({ isOn, size = 'normal' }: { isOn: boolean; size?: 'normal' | 'small' }) {
  const containerSize = size === 'normal' ? 'w-[32px] h-[32px]' : 'w-[26px] h-[26px]';
  const knobSize = size === 'normal' ? 'w-[26px] h-[26px]' : 'w-[20px] h-[20px]';

  return (
    <div
      className={`${containerSize} rounded-full flex items-center justify-center transition-all ${isOn ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-700'}`}
    >
      <div className={`${knobSize} rounded-full bg-white shadow-sm transition-all transform ${isOn ? 'translate-x-0' : 'scale-90'}`}>
        <img
          src={imgToggleSwitch}
          alt="Toggle"
          className="w-full h-full object-contain opacity-0"
        />
      </div>
    </div>
  );
}

export function DynamicCurtainIcon({ position = 0, color }: { position?: number; color?: string }) {
  // position: 0（关闭）到 100（全开）
  // viewBox 24x24，窗帘杆从 x=2 到 x=22（长度20）
  // 中心线在 x=12，左右面板各占一半空间（10单位）
  // 面板宽度：关闭时最大（10）→ 全开时最小（2）
  const maxHalfWidth = 10; // 单侧最大宽度（中心线到边缘）
  const minHalfWidth = 2;  // 单侧最小宽度（全开时）
  const halfWidth = maxHalfWidth - (position / 100) * (maxHalfWidth - minHalfWidth);
  
  const strokeColor = color || "currentColor";
  // 褶皱线 x 坐标：位于左/右帘布的中间位置
  const leftFoldX = 2 + halfWidth * 0.5;
  const rightFoldX = 22 - halfWidth * 0.5;

  // 悬挂点位置：位于帘布外边缘和内边缘
  const leftPanelOuterX = 2;           // 左帘布左边缘
  const leftPanelInnerX = 2 + halfWidth; // 左帘布右边缘（靠近中心）
  const rightPanelInnerX = 22 - halfWidth; // 右帘布左边缘（靠近中心）
  const rightPanelOuterX = 22;         // 右帘布右边缘

  // 悬挂环Y坐标：窗帘杆(y=3)下方
  const hookY = 4;      // 悬挂环中心
  const curtainTopY = 5.5; // 帘布顶部

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 窗帘杆 - 从 x=2 到 x=22 */}
      <path d="M2 3H22" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeOpacity={0.9} />

      {/* 悬挂系统 - 连接窗帘杆与帘布 */}
      {/* 左帘布悬挂点 */}
      <g>
        {/* 左外边缘悬挂环 */}
        <circle cx={leftPanelOuterX} cy={hookY} r="1" fill={strokeColor} fillOpacity={0.6} />
        {/* 左外边缘连接线 */}
        <line x1={leftPanelOuterX} y1={hookY + 1} x2={leftPanelOuterX} y2={curtainTopY}
          stroke={strokeColor} strokeWidth="0.5" strokeOpacity={0.4} />
        {/* 左内边缘悬挂环（仅当帘布足够宽时显示） */}
        {halfWidth > 3 && (
          <>
            <circle cx={leftPanelInnerX} cy={hookY} r="1" fill={strokeColor} fillOpacity={0.6} />
            <line x1={leftPanelInnerX} y1={hookY + 1} x2={leftPanelInnerX} y2={curtainTopY}
              stroke={strokeColor} strokeWidth="0.5" strokeOpacity={0.4} />
          </>
        )}
      </g>

      {/* 右帘布悬挂点 */}
      <g>
        {/* 右外边缘悬挂环 */}
        <circle cx={rightPanelOuterX} cy={hookY} r="1" fill={strokeColor} fillOpacity={0.6} />
        {/* 右外边缘连接线 */}
        <line x1={rightPanelOuterX} y1={hookY + 1} x2={rightPanelOuterX} y2={curtainTopY}
          stroke={strokeColor} strokeWidth="0.5" strokeOpacity={0.4} />
        {/* 右内边缘悬挂环（仅当帘布足够宽时显示） */}
        {halfWidth > 3 && (
          <>
            <circle cx={rightPanelInnerX} cy={hookY} r="1" fill={strokeColor} fillOpacity={0.6} />
            <line x1={rightPanelInnerX} y1={hookY + 1} x2={rightPanelInnerX} y2={curtainTopY}
              stroke={strokeColor} strokeWidth="0.5" strokeOpacity={0.4} />
          </>
        )}
      </g>

      {/* 左窗帘面板 - 从 x=2 开始，宽度 halfWidth，右边缘对齐中心线 */}
      <rect x="2" y="5.5" width={halfWidth} height="15" rx="0"
        fill={strokeColor} fillOpacity={0.12}
        stroke={strokeColor} strokeWidth="1.5" strokeOpacity={0.8} />
      {/* 左帘布褶皱线 */}
      {halfWidth > 3 && (
        <line x1={leftFoldX} y1="6.5" x2={leftFoldX} y2="19.5"
          stroke={strokeColor} strokeWidth="0.5" strokeOpacity={0.2} />
      )}
      {/* 右窗帘面板 - 从中心线(22-halfWidth)开始，到 x=22 结束 */}
      <rect x={22 - halfWidth} y="5.5" width={halfWidth} height="15" rx="0"
        fill={strokeColor} fillOpacity={0.12}
        stroke={strokeColor} strokeWidth="1.5" strokeOpacity={0.8} />
      {/* 右帘布褶皱线 */}
      {halfWidth > 3 && (
        <line x1={rightFoldX} y1="6.5" x2={rightFoldX} y2="19.5"
          stroke={strokeColor} strokeWidth="0.5" strokeOpacity={0.2} />
      )}
    </svg>
  );
}

export function DeviceIcon({ icon, isOn, value }: { icon: string; isOn: boolean; type: string; value?: number }) {
  const iconColor = isOn ? 'var(--foreground)' : 'rgba(4, 4, 4, 0.48)';

  return (
    <div
      className="haui-icon-disc w-[32px] h-[32px] shrink-0 aspect-square rounded-full flex items-center justify-center"
    >
      {icon === 'remote' && (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
          <rect x="7" y="2" width="10" height="20" rx="2" stroke={iconColor} strokeWidth="1.5" />
          <path d="M12 18h.01" stroke={iconColor} strokeWidth="2" strokeLinecap="round" />
          <path d="M10 6h4" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {icon === 'lamp' && (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p3c0b3100} stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p27b3edf2} stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d={svgPaths.p1c587a00} stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      )}
      {/* 统一灯光设备图标：所有灯光相关设备使用统一的灯泡图标 */}
      {(icon === 'light' || icon === 'Lightbulb' || icon === 'lightbulb') && (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
          <path d="M9 18h6" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 22h4" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {icon === 'monitor' && (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
          <path d={svgPaths.p26baae80} stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M12 17.22V22" stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M2 13H22" stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <path d="M7.5 22H16.5" stroke={iconColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      )}
      {icon === 'wind' && (
        <Fan
          className={`w-5 h-5 transition-all duration-300 ${isOn ? 'animate-[spin_2s_linear_infinite] motion-reduce:animate-none' : ''}`}
          color={iconColor}
          strokeWidth={1.5}
        />
      )}
      {icon === 'curtain' && (
        // 窗帘图标：与其他图标统一深色背景，使用 iconColor 保持色彩一致
        <div className="w-5 h-5 flex items-center justify-center">
          <DynamicCurtainIcon position={value !== undefined ? value : 0} color={iconColor} />
        </div>
      )}
      {icon === 'door' && (
        <DoorOpen className="w-5 h-5" style={{ stroke: iconColor }} />
      )}
      {icon === 'water' && (
        <Droplet className="w-5 h-5" style={{ stroke: iconColor }} />
      )}
      {icon === 'motion' && (
        <UserRound className="w-5 h-5" style={{ stroke: iconColor }} />
      )}
      {icon !== 'remote' &&
        icon !== 'lamp' &&
        icon !== 'light' &&
        icon !== 'Lightbulb' &&
        icon !== 'lightbulb' &&
        icon !== 'monitor' &&
        icon !== 'wind' &&
        icon !== 'curtain' &&
        icon !== 'door' &&
        icon !== 'water' &&
        icon !== 'motion' && (
          <CustomIcon
            name={icon || ''}
            className={`w-5 h-5 ${isOn ? 'text-foreground' : 'text-muted-foreground'}`}
          />
        )}
    </div>
  );
}

export function LargeCurtainVisual({ position = 0, isDragging = false }: { position?: number; isDragging?: boolean }) {
  // position: 0（关闭）到 100（全开）
  // 单侧面板宽度百分比：50%（完全关闭居中）→ 10%（全开收拢两侧）
  // 修复：确保关闭时左右面板完全贴合，无缝隙
  const panelWidth = 50 - (position / 100) * 40;

  // 拖拽时关闭过渡动画，保证跟手丝滑
  const transitionClass = isDragging ? '' : 'transition-all duration-200 ease-out';

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* 窗帘杆 - 纤细横杆，贴近顶部 */}
      <div className="absolute top-1.5 left-1 right-1 h-[2px] rounded-sm z-10
        bg-slate-300/70 dark:bg-slate-500/55" />

      {/* 窗帘面板容器 - 使用与窗帘杆相同的左右边距（left-1 right-1），确保宽度一致 */}
      <div className="absolute inset-x-1 top-0 bottom-0">
        {/* ── 左帘布面板 ── 纯直角 + 飘逸轻盈设计 */}
        {/* 左面板：从左边缘开始，宽度为 panelWidth%，右边缘靠近中心线 */}
        <div
          className={`absolute top-[14px] bottom-0 left-0 ${transitionClass}`}
          style={{ width: `${panelWidth}%` }}
        >
          {/* 帘布主体：三段式渐变，飘逸轻盈 */}
          <div className="absolute inset-0
            bg-gradient-to-b from-slate-300/65 via-slate-200/55 to-slate-100/45
            dark:from-slate-500/55 dark:via-slate-600/45 dark:to-slate-700/35" />
          {/* 褶皱纹理：11px 周期竖向条纹，模拟布料自然垂坠 */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0px, transparent 10px, rgba(0,0,0,0.04) 10px, rgba(0,0,0,0.04) 11px)',
            }}
          />
          {/* 底部淡出层 - 增强飘逸感 */}
          <div className="absolute bottom-0 left-0 right-0 h-5
            bg-gradient-to-t from-white/20 to-transparent
            dark:from-black/15" />
          {/* 右侧边缘轻微阴影 - 帘布立体感 */}
          <div className="absolute inset-y-0 right-0 w-1.5
            bg-gradient-to-l from-black/[0.04] to-transparent" />
        </div>

        {/* ── 右帘布面板 ── 纯直角 + 飘逸轻盈设计 */}
        {/* 右面板：从右边缘开始，宽度为 panelWidth%，左边缘靠近中心线 */}
        <div
          className={`absolute top-[14px] bottom-0 right-0 ${transitionClass}`}
          style={{ width: `${panelWidth}%` }}
        >
          <div className="absolute inset-0
            bg-gradient-to-b from-slate-300/65 via-slate-200/55 to-slate-100/45
            dark:from-slate-500/55 dark:via-slate-600/45 dark:to-slate-700/35" />
          {/* 褶皱纹理 */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0px, transparent 10px, rgba(0,0,0,0.04) 10px, rgba(0,0,0,0.04) 11px)',
            }}
          />
          {/* 底部淡出层 */}
          <div className="absolute bottom-0 left-0 right-0 h-5
            bg-gradient-to-t from-white/20 to-transparent
            dark:from-black/15" />
          {/* 左侧边缘轻微阴影 */}
          <div className="absolute inset-y-0 left-0 w-1.5
            bg-gradient-to-r from-black/[0.04] to-transparent" />
        </div>

        {/* 中缝线（完全关闭时显示，表示两侧帘布合拢处） */}
        <div
          className={`absolute top-[14px] bottom-0 left-1/2 w-px -translate-x-px ${transitionClass}
            bg-slate-400/25 dark:bg-slate-500/20`}
          style={{ opacity: position < 8 ? 1 : 0 }}
        />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Unified Card Components
// ----------------------------------------------------------------------

// 1. Unified Card Wrapper
export function DeviceCardWrapper({ children, className, onClick, isEditing, isCommon, onToggleCommon }: DeviceCardWrapperProps) {
  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isEditing ? -1 : 0}
      className={`haui-soft-card relative aspect-square rounded-[24px] p-3 overflow-hidden transition-all duration-200 flex flex-col ${isEditing ? 'cursor-default ring-2 ring-primary/20 scale-[0.98]' : 'hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none'
        } ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      {/* Background Pattern - Always Dark/Neutral (Default) */}
      <div className="absolute left-[-27px] top-[-27px] w-[117px] h-[117px] pointer-events-none opacity-50">
        <svg className="block w-full h-full" fill="none" viewBox="0 0 117 117">
          <circle cx="58.5" cy="58.5" r="58.25" stroke="url(#paint0_dark)" strokeOpacity="0.1" strokeWidth="0.5" />
          <circle cx="58.875" cy="58.875" r="43.625" stroke="url(#paint1_dark)" strokeOpacity="0.1" strokeWidth="0.5" />
          <defs>
            <linearGradient id="paint0_dark" x1="58.5" y1="0" x2="58.5" y2="117">
              <stop stopColor="currentColor" />
              <stop offset="1" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="paint1_dark" x1="58.875" y1="15" x2="58.875" y2="102.75">
              <stop stopColor="currentColor" />
              <stop offset="1" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Editing Overlay */}
      {isEditing && (
        <div
          className="absolute -right-2 -top-2 z-50 p-4 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onToggleCommon?.(e); }}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors ${isCommon ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}>
            {isCommon ? <X className="w-4 h-4" /> : <div className="w-4 h-4 flex items-center justify-center font-bold text-lg leading-none pb-0.5">+</div>}
          </div>
        </div>
      )}

      {/* Content Layer */}
      <div className="flex flex-col h-full gap-2 relative z-10">
        {children}
      </div>
    </div>
  );
}

// 2. Unified Header
export function DeviceCardHeader({ device, onToggle, value }: DeviceCardHeaderProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* 第一行：图标、名称、开关 */}
      <div className="flex items-center justify-between min-h-[32px]">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <DeviceIcon icon={device.icon} isOn={device.isOn} type={device.type} value={value} />
          <span className="font-['SF_Pro_Display',sans-serif] text-[14px] font-medium truncate leading-tight mt-[1px] text-foreground">
            {device.name}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(e); }}
          className="shrink-0 ml-1"
        >
          <SquareToggle isOn={device.isOn} size="small" />
        </button>
      </div>
    </div>
  );
}

// 3. 卡片中央时间戳组件
export function DeviceCardCenterTimestamp({ device, nowMs }: { device: Device; nowMs: number }) {
  const lastChangedTime = device.lastChanged || device.lastUpdated;

  return (
    <div className="flex-1 flex items-center justify-center">
      <SensorTimestamp
        lastChanged={lastChangedTime}
        available={device.haAvailable !== false}
        nowMs={nowMs}
        variant="compact"
        className="text-[10px]"
      />
    </div>
  );
}
