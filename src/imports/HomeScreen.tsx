import React from 'react';
import svgPaths from "./svg-vz3fosb0v5";
import imgProfilePicture from "figma:asset/4b5f4ef1982ec6672e2503261eebd452dea5062f.png";

/**
 * HomeScreen 组件 - 响应式重构版本
 * 将原有的绝对定位布局改为 Flexbox/Grid 响应式布局
 */

// 状态栏组件
function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 py-3 w-full" data-name="Status Bar">
      <p className="font-['SF_Pro_Display',sans-serif] text-[15px] font-semibold text-[#040415]">
        9:41
      </p>
      <div className="flex items-center gap-1">
        {/* 信号、WiFi、电池图标 */}
        <svg className="w-[58px] h-[10px]" fill="none" viewBox="0 0 58 10">
          <g opacity="0.4">
            <rect x="38" y="0.5" width="18" height="9" rx="2" stroke="#040415" strokeWidth="0.7" opacity="0.35"/>
            <rect x="39.5" y="2" width="15" height="6" rx="1" fill="#040415"/>
            <path d="M57 3v4" stroke="#040415" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          </g>
          <path d="M28 2l3 3-3 3M24 2l3 3-3 3" stroke="#040415" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M4 6c1.5-2 3.5-2 5 0M2 4c2.5-3 6.5-3 9 0M0 2c3.5-4 8.5-4 12 0" stroke="#040415" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

// 首页指示器
function HomeIndicator() {
  return (
    <div className="flex justify-center pb-2 w-full" data-name="Home Indicator">
      <div className="w-32 h-1 bg-[#040415] rounded-full opacity-20" />
    </div>
  );
}

// 头部组件 - 包含问候语和头像
function Header() {
  return (
    <div className="flex items-center justify-between w-full px-6 py-4" data-name="Header">
      <div className="flex flex-col gap-1">
        <p className="font-['SF_Pro_Display',sans-serif] text-sm text-[rgba(4,4,21,0.6)]">
          Hey, Fahmi 👋
        </p>
        <div className="font-['SF_Pro_Display',sans-serif] text-[#040415] text-2xl md:text-3xl tracking-tight">
          <p>Welcome to</p>
          <p className="font-light">SmartHome!</p>
        </div>
      </div>
      <div className="relative rounded-full shadow-lg shrink-0">
        <div 
          className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden"
          style={{ backgroundImage: "linear-gradient(140.848deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" }}
        >
          <img 
            alt="Profile" 
            className="w-full h-full object-cover" 
            src={imgProfilePicture} 
          />
        </div>
      </div>
    </div>
  );
}

// 能耗信息卡片
function EnergyCard() {
  return (
    <div className="mx-6 p-5 bg-white rounded-3xl shadow-[0px_0px_24px_0px_rgba(0,0,0,0.08)] flex items-center justify-between" data-name="Energy Card">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 opacity-40">
          <svg className="w-4 h-4" viewBox="0 0 12 13" fill="none">
            <path d={svgPaths.p3d525a00} fill="currentColor"/>
          </svg>
          <span className="font-['SF_Pro_Display',sans-serif] text-xs text-[#040415]">26 June 2024</span>
        </div>
        <p className="font-['SF_Pro_Display',sans-serif] font-semibold text-[#040415] text-lg">
          Energy Usage
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-[#65cf58] text-3xl font-light">321.4</span>
          <span className="text-sm text-[rgba(4,4,21,0.4)]">KW/h</span>
        </div>
      </div>
      {/* 右侧装饰图形 */}
      <div className="relative w-24 h-20 md:w-32 md:h-24 shrink-0">
        <svg className="w-full h-full" viewBox="0 0 100 80" fill="none">
          <circle cx="70" cy="35" r="20" fill="url(#energyGrad)"/>
          <defs>
            <linearGradient id="energyGrad" x1="70" y1="15" x2="70" y2="55">
              <stop stopColor="#FFB432"/>
              <stop offset="1" stopColor="#FE4C00"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

// 房间标签
function RoomBadge({ name, active = false }: { name: string; active?: boolean }) {
  return (
    <div 
      className={`px-4 py-2 rounded-2xl shrink-0 cursor-pointer transition-all ${
        active 
          ? "text-white font-semibold shadow-lg" 
          : "bg-white text-[rgba(4,4,21,0.6)]"
      }`}
      style={active ? { backgroundImage: "linear-gradient(163.817deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" } : {}}
      data-name="Room Badge"
    >
      <p className="font-['SF_Pro_Display',sans-serif] text-sm whitespace-nowrap">{name}</p>
    </div>
  );
}

// 房间标签列表
function RoomTabs() {
  const rooms = ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom'];
  return (
    <div className="flex gap-2 overflow-x-auto px-6 py-2 scrollbar-hide" data-name="Room Tabs">
      {rooms.map((room, index) => (
        <RoomBadge key={room} name={room} active={index === 0} />
      ))}
    </div>
  );
}

// 设备卡片
function DeviceCard({ 
  title, 
  subtitle, 
  value, 
  unit, 
  isOn, 
  icon,
  dark = false 
}: { 
  title: string; 
  subtitle: string; 
  value?: string; 
  unit?: string;
  isOn: boolean;
  icon: 'lamp' | 'tv' | 'cctv' | 'ac';
  dark?: boolean;
}) {
  const IconSvg = () => {
    switch (icon) {
      case 'lamp':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 21h6M12 17v4M8 11V7a4 4 0 118 0v4" strokeLinecap="round"/>
            <path d="M6 11h12v3a3 3 0 01-3 3H9a3 3 0 01-3-3v-3z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'tv':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="4" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 21h8M12 17v4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'cctv':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 8v4l3 3M2 12h2M20 12h2M12 2a10 10 0 100 20 10 10 0 000-20z"/>
          </svg>
        );
      case 'ac':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  return (
    <div 
      className={`relative p-4 rounded-3xl overflow-hidden ${
        dark 
          ? "text-white" 
          : "bg-white text-[#040415]"
      }`}
      style={dark ? { backgroundImage: "linear-gradient(136.033deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" } : {}}
      data-name="Device Card"
    >
      {/* 背景装饰圆环 */}
      <div className="absolute -left-6 -top-6 w-24 h-24 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="0.5" fill="none"/>
          <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="0.5" fill="none"/>
          <circle cx="50" cy="50" r="25" stroke="currentColor" strokeWidth="0.5" fill="none"/>
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* 头部：图标和蓝牙 */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-2xl ${dark ? "bg-white/10" : "bg-white shadow-sm"}`}>
            <IconSvg />
          </div>
          <svg className="w-5 h-5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" opacity="0.2"/>
            <path d="M7 7.5l5 5-5 5M12 7.5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* 内容 */}
        <div className="flex-1">
          <h3 className="font-['SF_Pro_Display',sans-serif] font-semibold text-base mb-1">{title}</h3>
          <p className={`text-xs ${dark ? "text-white/60" : "text-[rgba(4,4,21,0.4)]"}`}>{subtitle}</p>
        </div>

        {/* 底部：数值和开关 */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-current border-opacity-10">
          <div className="flex items-baseline gap-1">
            {value && <span className="text-[#65cf58] text-sm">{value}</span>}
            {unit && <span className={`text-xs ${dark ? "text-white/80" : "text-[rgba(4,4,21,0.6)]"}`}>{unit}</span>}
          </div>
          <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${
            isOn ? "bg-white/60" : dark ? "bg-white/20" : "bg-gray-200"
          }`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all ${
              isOn ? "left-5" : "left-1"
            }`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// 设备卡片网格
function DeviceGrid() {
  const devices = [
    { title: 'Lighting', subtitle: '6 lamps', value: '12.5', unit: 'KW/h', isOn: true, icon: 'lamp' as const, dark: true },
    { title: 'Smart TV', subtitle: '1 Smart TV', value: '17.5', unit: 'KW/h', isOn: false, icon: 'tv' as const },
    { title: 'CCTV', subtitle: '1 CCTV', value: '17.5', unit: 'KW/h', isOn: false, icon: 'cctv' as const },
    { title: 'Air Conditioning', subtitle: '6 lamps', value: '12.5', unit: 'KW/h', isOn: true, icon: 'ac' as const, dark: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 px-6 py-4" data-name="Device Grid">
      {devices.map((device) => (
        <DeviceCard key={device.title} {...device} />
      ))}
    </div>
  );
}

// 底部导航栏
function TabBar() {
  const navItems = [
    { icon: 'home', active: true },
    { icon: 'grid' },
    { icon: 'add', special: true },
    { icon: 'bell' },
    { icon: 'settings' },
  ];

  return (
    <div className="mx-6 mb-6 px-6 py-3 bg-white rounded-[32px] shadow-[0px_0px_50px_0px_rgba(0,0,0,0.24)] flex items-center justify-between" data-name="Tab Bar">
      {navItems.map((item, index) => (
        <button 
          key={index}
          className={`flex items-center justify-center transition-all ${
            item.special 
              ? "w-10 h-10 rounded-full text-white" 
              : "w-8 h-8 rounded-full"
          } ${item.active ? "text-[#040415]" : "text-[rgba(4,4,21,0.4)]"}`}
          style={item.special ? { backgroundImage: "linear-gradient(140.848deg, rgb(32, 32, 45) 1.2863%, rgb(16, 16, 19) 103.1%)" } : {}}
        >
          {item.special ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
          ) : (
            <NavIcon name={item.icon} />
          )}
        </button>
      ))}
    </div>
  );
}

// 导航图标
function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactElement> = {
    home: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 9v11h7v-7h6v7h7V9L12 2z"/>
      </svg>
    ),
    grid: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    bell: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zM18 16v-5c0-3.1-1.6-5.6-4.5-6.3V4c0-.8-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v.7C7.6 5.4 6 7.9 6 11v5l-2 2v1h16v-1l-2-2z"/>
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
      </svg>
    ),
  };
  return icons[name] || null;
}

// 主页面组件
export default function HomeScreen() {
  return (
    <div className="min-h-screen bg-white flex flex-col" data-name="Home Screen">
      {/* 状态栏 */}
      <StatusBar />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col gap-4 pb-4">
        {/* 头部 */}
        <Header />
        
        {/* 能耗卡片 */}
        <EnergyCard />
        
        {/* 房间标签 */}
        <RoomTabs />
        
        {/* 设备网格 */}
        <DeviceGrid />
      </div>
      
      {/* 底部导航 */}
      <TabBar />
      
      {/* 首页指示器 */}
      <HomeIndicator />
    </div>
  );
}
