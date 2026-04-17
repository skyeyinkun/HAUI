/**
 * UI 图标规范常量
 * 用于统一项目中所有图标的尺寸、线条粗细和风格
 */

// 图标尺寸规范
export const ICON_SIZES = {
  // 设备卡片中的图标
  deviceCard: {
    header: 16,      // 设备头部图标 (如电源状态)
    control: 16,     // 控制区域图标 (如亮度、色温)
    status: 14,      // 状态指示图标
  },
  // 遥控器相关图标
  remote: {
    button: 14,      // 遥控器按钮图标
    dpad: 16,        // 方向键图标
    profile: 10,     // 配置文件切换图标
    power: 14,       // 电源按钮图标
  },
  // 设置界面图标
  settings: {
    nav: 20,         // 导航图标
    section: 18,     // 分区标题图标
    item: 16,        // 设置项图标
  },
  // 资产选择器图标
  picker: {
    grid: 20,        // 图标网格中的图标
    search: 16,      // 搜索框图标
    selected: 16,    // 选中状态图标
  },
  // 通用图标
  common: {
    xs: 12,          // 超小图标
    sm: 14,          // 小图标
    md: 16,          // 中等图标 (默认)
    lg: 20,          // 大图标
    xl: 24,          // 超大图标
  },
} as const;

// 线条粗细规范 (stroke-width)
export const ICON_STROKE_WIDTH = {
  thin: 1.5,         // 细线 (用于小图标)
  normal: 2,         // 标准线 (默认)
  bold: 2.5,         // 粗线 (用于大图标或强调)
} as const;

// 图标颜色规范
export const ICON_COLORS = {
  // 根据状态的颜色
  default: 'text-muted-foreground',
  active: 'text-foreground',
  primary: 'text-primary',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  danger: 'text-red-500',
  // 特定场景
  deviceOn: 'text-green-500',
  deviceOff: 'text-muted-foreground',
  slider: 'text-foreground/80',
} as const;

// Lucide 图标统一的 className 生成器
export const getIconClass = (options: {
  size?: number | keyof typeof ICON_SIZES.common;
  strokeWidth?: number | keyof typeof ICON_STROKE_WIDTH;
  color?: string;
  className?: string;
} = {}) => {
  const {
    size = 'md',
    strokeWidth = 'normal',
    color = '',
    className = '',
  } = options;

  const sizeValue = typeof size === 'number' ? size : ICON_SIZES.common[size];
  const strokeValue = typeof strokeWidth === 'number' 
    ? strokeWidth 
    : ICON_STROKE_WIDTH[strokeWidth];

  const classes = [
    'shrink-0',
    color,
    className,
  ].filter(Boolean);

  return {
    className: classes.join(' '),
    style: {
      width: `${sizeValue}px`,
      height: `${sizeValue}px`,
      strokeWidth: strokeValue,
    },
  };
};

// 常用图标尺寸快捷配置
export const ICON_PROPS = {
  // 设备卡片控制图标 (亮度、色温等)
  deviceControl: {
    size: ICON_SIZES.deviceCard.control,
    strokeWidth: ICON_STROKE_WIDTH.normal,
    className: 'text-foreground/80',
  },
  // 遥控器按钮图标
  remoteButton: {
    size: ICON_SIZES.remote.button,
    strokeWidth: ICON_STROKE_WIDTH.thin,
    className: 'text-foreground/70',
  },
  // 遥控器方向键
  remoteDpad: {
    size: ICON_SIZES.remote.dpad,
    strokeWidth: ICON_STROKE_WIDTH.thin,
    className: 'text-foreground/70',
  },
  // 遥控器电源按钮
  remotePower: {
    size: ICON_SIZES.remote.power,
    strokeWidth: ICON_STROKE_WIDTH.normal,
    className: 'text-current',
  },
  // 资产选择器图标
  pickerGrid: {
    size: ICON_SIZES.picker.grid,
    className: 'text-current',
  },
  // 搜索图标
  search: {
    size: ICON_SIZES.picker.search,
    strokeWidth: ICON_STROKE_WIDTH.normal,
    className: 'text-muted-foreground',
  },
  // 关闭/删除图标
  close: {
    size: ICON_SIZES.common.sm,
    strokeWidth: ICON_STROKE_WIDTH.normal,
    className: 'text-current',
  },
} as const;
