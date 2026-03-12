import React from 'react';
import { X, Fan, DoorOpen, Droplet, UserRound } from 'lucide-react';
import svgPaths from "@/imports/svg-vz3fosb0v5";
import imgToggleSwitch from "@/assets/toggle_switch.png";
import { Device } from '@/types/device';
import { CustomIcon } from './shared/CustomIcon';

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
    <div className={`w-2.5 h-2.5 rounded-full ${isOn ? 'bg-[#65cf58]' : 'bg-black/10 dark:bg-white/10'}`} />
  );
}

export function SquareToggle({ isOn, size = 'normal' }: { isOn: boolean; size?: 'normal' | 'small' }) {
  const containerSize = size === 'normal' ? 'w-[32px] h-[32px]' : 'w-[26px] h-[26px]';
  const knobSize = size === 'normal' ? 'w-[26px] h-[26px]' : 'w-[20px] h-[20px]';

  return (
    <div
      className={`${containerSize} rounded-full flex items-center justify-center transition-all ${isOn ? 'bg-[#65cf58]' : 'bg-[#e5e5ea]'}`}
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

export function DynamicCurtainIcon({ position = 0, color = "currentColor" }: { position?: number; color?: string }) {
  // position: 0 (closed) to 100 (open)
  // At 0 (Closed): width is large (~9), panels meet in center
  // At 100 (Open): width is small (~2), panels at sides
  const width = 9 - (position / 100) * 7;

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rod */}
      <path d="M2 3H22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Left Curtain */}
      <rect x="2" y="6" width={width} height="15" rx="1" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="1.5" />
      {/* Right Curtain */}
      <rect x={22 - width} y="6" width={width} height="15" rx="1" fill={color} fillOpacity={0.3} stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function DeviceIcon({ icon, isOn, value }: { icon: string; isOn: boolean; type: string; value?: number }) {
  // Green if on, White if off (since bg is dark)
  const iconColor = isOn ? "#65cf58" : "white";

  return (
    <div
      className="w-[32px] h-[32px] shrink-0 aspect-square rounded-[12px] flex items-center justify-center shadow-[0px_0px_12px_0px_rgba(0,0,0,0.08)]"
      style={{ backgroundImage: "linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
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
        <DynamicCurtainIcon position={value !== undefined ? value : 0} color={iconColor} />
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
        icon !== 'monitor' &&
        icon !== 'wind' &&
        icon !== 'curtain' &&
        icon !== 'door' &&
        icon !== 'water' &&
        icon !== 'motion' && (
          <CustomIcon
            name={icon || ''}
            className={`w-5 h-5 ${isOn ? 'text-[#65cf58]' : 'text-white'}`}
          />
        )}
    </div>
  );
}

export function LargeCurtainVisual({ position = 0 }: { position?: number }) {
  // position: 0 (closed) to 100 (open)
  // At 0: panels meet in center. At 100: panels at sides.
  // We use a percentage-based width for responsiveness.
  // Max width of one panel is 50% (meets in middle).
  // Min width is e.g. 10% (bunched at side).
  // width% = 50 - (position / 100 * 40) -> ranges from 50% to 10%
  const panelWidth = 50 - (position / 100) * 40;

  return (
    <div className="w-full h-full relative">
      {/* Window Glass Background - Subtle accent/muted tint */}
      <div className="absolute inset-2 top-4 bg-muted/20 rounded-sm border border-border/20" />

      {/* Curtain Rod */}
      <div className="absolute top-3 left-1 right-1 h-1 bg-muted-foreground/30 rounded-full z-10" />

      {/* Left Curtain Panel */}
      <div
        className="absolute top-3 bottom-0 left-0 bg-primary/20 backdrop-blur-sm shadow-sm transition-all duration-300 ease-out border-r border-primary/10 rounded-br-lg"
        style={{ width: `${panelWidth}%` }}
      >
        {/* Fabric Folds */}
        <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(0,0,0,0.1)_12px,transparent_14px)]" />
      </div>

      {/* Right Curtain Panel */}
      <div
        className="absolute top-3 bottom-0 right-0 bg-primary/20 backdrop-blur-sm shadow-sm transition-all duration-300 ease-out border-l border-primary/10 rounded-bl-lg"
        style={{ width: `${panelWidth}%` }}
      >
        {/* Fabric Folds */}
        <div className="w-full h-full opacity-30 bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(0,0,0,0.1)_12px,transparent_14px)]" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Unified Card Components
// ----------------------------------------------------------------------

// 1. Unified Card Wrapper
export function DeviceCardWrapper({ children, className, onClick, isEditing, isCommon, onToggleCommon }: DeviceCardWrapperProps) {
  return (
    <div
      className={`relative aspect-square rounded-[16px] p-3 shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] overflow-hidden transition-all duration-200 flex flex-col ${isEditing ? 'cursor-default ring-2 ring-primary/20 scale-[0.98]' : 'hover:scale-105 cursor-default'
        } ${className}`}
      style={{ backgroundColor: "var(--card)" }}
      onClick={onClick}
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
  );
}
