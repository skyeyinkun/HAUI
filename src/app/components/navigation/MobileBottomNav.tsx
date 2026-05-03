import { Camera, Home, LayoutGrid, Settings, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  onHome: () => void;
  onRooms: () => void;
  onAi: () => void;
  onCameras: () => void;
  onSettings: () => void;
}

const items = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'rooms', label: '房间', icon: LayoutGrid },
  { key: 'ai', label: 'AI', icon: Sparkles },
  { key: 'cameras', label: '监控', icon: Camera },
  { key: 'settings', label: '设置', icon: Settings },
] as const;

export function MobileBottomNav({
  onHome,
  onRooms,
  onAi,
  onCameras,
  onSettings,
}: MobileBottomNavProps) {
  const handlers = {
    home: onHome,
    rooms: onRooms,
    ai: onAi,
    cameras: onCameras,
    settings: onSettings,
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-black/5 bg-white/90 backdrop-blur-2xl shadow-[0_-12px_32px_rgba(0,0,0,0.08)] haui-mobile-tabbar-safe">
      <div className="mx-auto grid max-w-[520px] grid-cols-5 px-2 pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={handlers[item.key]}
              className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[14px] text-[11px] font-medium text-[rgba(4,4,21,0.55)] transition-colors active:bg-accent"
              aria-label={item.label}
            >
              <Icon className="h-5 w-5 text-[#334155]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
