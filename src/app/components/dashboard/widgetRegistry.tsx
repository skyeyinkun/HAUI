import { Cloud, Thermometer, Zap, Activity, FileText, LucideIcon } from 'lucide-react';
import { WidgetType } from '@/hooks/useDashboardLayout';

/**
 * 小组件元数据定义
 */
export interface WidgetMetadata {
  type: WidgetType;
  label: string;
  desc: string;
  icon: LucideIcon;
  defaultW: number; // 默认列跨度 (1-3)
  defaultH: number; // 默认行跨度 (以 100px 为单位)
}

/**
 * 全局小组件注册表
 */
export const WIDGET_REGISTRY: Record<WidgetType, WidgetMetadata> = {
  weather: {
    type: 'weather',
    label: '天气控件',
    desc: '实时天气与三日预报',
    icon: Cloud,
    defaultW: 1,
    defaultH: 1,
  },
  // 默认高度调整为 3 (约 300px)，这能完美容纳 3 行（6 个）实体参数
  indoor: {
    type: 'indoor',
    label: '室内环境',
    desc: '汇总全屋温湿度与空气质量',
    icon: Thermometer,
    defaultW: 1,
    defaultH: 3,
  },
  energy: {
    type: 'energy',
    label: '能源看板',
    desc: '全屋能耗与功率统计',
    icon: Zap,
    defaultW: 1,
    defaultH: 1,
  },
  sensor_status: {
    type: 'sensor_status',
    label: '设备状态',
    desc: '门窗/人体/水浸等快速纵览',
    icon: Activity,
    defaultW: 1,
    defaultH: 3,
  },
  logs: {
    type: 'logs',
    label: '实时日志',
    desc: '监控系统与设备流日志',
    icon: FileText,
    defaultW: 1,
    defaultH: 3,
  },
};

/**
 * 获取可用的部件列表（用于选择器）
 */
export const getAvailableWidgets = () => Object.values(WIDGET_REGISTRY);

/**
 * 根据类型获取网格类名
 */
export const getWidgetGridClasses = (type: WidgetType, customW?: number, customH?: number) => {
  const metadata = WIDGET_REGISTRY[type];
  const w = customW || metadata?.defaultW || 1;
  const h = customH || metadata?.defaultH || 1;

  // 使用映射以支持 Tailwind JIT 静态扫描
  const colSpans: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-2 lg:col-span-3'
  };

  const rowSpans: Record<number, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
    5: 'row-span-5',
    6: 'row-span-6'
  };

  const colSpan = colSpans[w] || 'col-span-1';
  const rowSpan = rowSpans[h] || 'row-span-1';

  return `${colSpan} ${rowSpan}`;
};
