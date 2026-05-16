import { Camera, Home, LayoutGrid, Settings, Sparkles } from 'lucide-react';

const items = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'rooms', label: '房间', icon: LayoutGrid },
  { key: 'ai', label: 'AI', icon: Sparkles },
  { key: 'cameras', label: '监控', icon: Camera },
  { key: 'settings', label: '设置', icon: Settings },
] as const;

interface MobileBottomNavProps {
  activeKey?: typeof items[number]['key'];
  onHome: () => void;
  onRooms: () => void;
  onAi: () => void;
  onCameras: () => void;
  onSettings: () => void;
}

export function MobileBottomNav({
  activeKey = 'home',
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
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-3 md:hidden haui-mobile-tabbar-safe">
      <div className="haui-glass-panel pointer-events-auto mx-auto grid max-w-[520px] grid-cols-5 items-center rounded-[999px] px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          const isPrimary = item.key === 'ai';
          return (
            <button
              key={item.key}
              type="button"
              onClick={handlers[item.key]}
              className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                isPrimary
                  ? 'haui-ai-action-soft mx-auto -mt-2 h-[52px] w-[52px] text-white'
                  : isActive
                    ? 'text-[#050505]'
                    : 'text-[rgba(4,4,4,0.48)] hover:text-[#050505]'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <Icon className={`${isPrimary ? 'h-5 w-5 fill-white/5 stroke-[1.9] opacity-90' : 'h-5 w-5'} ${isActive && !isPrimary ? 'text-[#050505]' : ''}`} />
              {!isPrimary && <span>{item.label}</span>}
              {isPrimary && <span className="sr-only">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
