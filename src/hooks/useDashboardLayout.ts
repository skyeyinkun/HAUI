import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { WIDGET_REGISTRY } from '@/app/components/dashboard/widgetRegistry';

export type WidgetType = 'weather' | 'indoor' | 'energy' | 'sensor_status' | 'logs';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title?: string;
  // 宽度 (列跨度 1-3) 和高度 (100px 为单位的行跨度)
  w?: number;
  h?: number;
  // 用于存储自定义配置（例如跟踪特定传感器）
  config?: Record<string, any>;
}

const DEFAULT_LAYOUT: DashboardWidget[] = [
  { id: 'widget-weather-1', type: 'weather', title: '天气', w: 1, h: 1 },
  { id: 'widget-indoor-1', type: 'indoor', title: '室内环境', w: 1, h: 6 },
  { id: 'widget-energy-1', type: 'energy', title: '能源', w: 1, h: 1 },
  { id: 'widget-sensor-1', type: 'sensor_status', title: '设备状态', w: 1, h: 6 },
  { id: 'widget-logs-1', type: 'logs', title: '实时日志', w: 1, h: 6 },
];

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardWidget[]>([]);
  const { dashboardEditing: isEditing, setDashboardEditing: setIsEditing } = useUIStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ha_dashboard_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLayout(parsed);
          setIsInitialized(true);
          return;
        }
      } catch (e) {
        console.error('Failed to parse dashboard layout', e);
      }
    }
    setLayout(DEFAULT_LAYOUT);
    setIsInitialized(true);
  }, []);

  const saveLayout = (newLayout: DashboardWidget[]) => {
    setLayout(newLayout);
    localStorage.setItem('ha_dashboard_layout', JSON.stringify(newLayout));
  };

  const addWidget = (type: WidgetType, title?: string) => {
    // 根据项目结构，可能需要动态导入或通过注入方式获取注册表。
    // 这里采用最直接的逻辑，后续可根据需要进一步优化。
    const metadata = WIDGET_REGISTRY[type];
    const newWidget: DashboardWidget = {
      id: `widget-${type}-${Date.now()}`,
      type,
      title,
      w: metadata?.defaultW || 1, 
      h: metadata?.defaultH || 1
    };
    saveLayout([...layout, newWidget]);
  };

  const removeWidget = (id: string) => {
    saveLayout(layout.filter(w => w.id !== id));
  };

  const moveWidget = (oldIndex: number, newIndex: number) => {
    if (oldIndex < 0 || newIndex < 0 || oldIndex >= layout.length || newIndex >= layout.length) return;
    const newLayout = [...layout];
    const [removed] = newLayout.splice(oldIndex, 1);
    newLayout.splice(newIndex, 0, removed);
    saveLayout(newLayout);
  };

  return {
    layout,
    isEditing,
    setIsEditing,
    addWidget,
    removeWidget,
    moveWidget,
    isInitialized,
    saveLayout,
  };
}
