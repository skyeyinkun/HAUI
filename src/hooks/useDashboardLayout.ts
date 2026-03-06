import { useState, useEffect } from 'react';

export type WidgetType = 'weather' | 'indoor' | 'energy' | 'sensor_status' | 'logs';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title?: string;
  // Used to optionally store customized configurations (e.g. tracking specific sensors)
  config?: Record<string, any>;
}

const DEFAULT_LAYOUT: DashboardWidget[] = [
  { id: 'widget-weather-1', type: 'weather', title: '天气' },
  { id: 'widget-indoor-1', type: 'indoor', title: '室内环境' },
  { id: 'widget-energy-1', type: 'energy', title: '能源' },
  { id: 'widget-sensor-1', type: 'sensor_status', title: '设备状态' },
  { id: 'widget-logs-1', type: 'logs', title: '实时日志' },
];

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardWidget[]>([]);
  const [isEditing, setIsEditing] = useState(false);
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
    const newWidget: DashboardWidget = {
      id: `widget-${type}-${Date.now()}`,
      type,
      title,
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
