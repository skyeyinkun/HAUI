import { useState, useEffect } from 'react';
import { useUIStore } from '@/store/uiStore';
import { WIDGET_REGISTRY } from '@/app/components/dashboard/widgetRegistry';

export type WidgetType = 'weather' | 'indoor' | 'energy' | 'sensor_status' | 'logs' | 'camera';

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
  { id: 'widget-camera-1', type: 'camera', title: '监控', w: 2, h: 3 }, // 3.12.0 新增默认监控位
  { id: 'widget-indoor-1', type: 'indoor', title: '室内环境', w: 1, h: 3 },
  { id: 'widget-energy-1', type: 'energy', title: '能源', w: 1, h: 1 },
  { id: 'widget-sensor-1', type: 'sensor_status', title: '设备状态', w: 1, h: 3 },
  { id: 'widget-logs-1', type: 'logs', title: '实时日志', w: 1, h: 3 },
];

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardWidget[]>([]);
  const { dashboardEditing: isEditing, setDashboardEditing: setIsEditing } = useUIStore();
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    const initLayout = async () => {
      // 1. 尝试从服务端同步最新数据
      const { syncFromServer } = await import('@/utils/sync');
      await syncFromServer();

      // 2. 读取本地（可能是刚同步下来的）数据并加载
      loadLocalLayout();
    };

    const loadLocalLayout = () => {
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
      
      // 3. 兜底默认布局
      setLayout(DEFAULT_LAYOUT);
      setIsInitialized(true);
    };

    // 初始化加载
    initLayout();

    // 4. 监听全局同步完成事件，实现无刷新对齐
    const handleSyncComplete = () => {
      console.debug('[HAUI Layout] 检测到云端布局更新，正在重载...');
      loadLocalLayout();
    };
    window.addEventListener('haui-sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('haui-sync-complete', handleSyncComplete);
    };
  }, []);

  const saveLayout = (newLayout: DashboardWidget[]) => {
    setLayout(newLayout);
    localStorage.setItem('ha_dashboard_layout', JSON.stringify(newLayout));
    // 触发云同步，避免刷新被服务端旧配置覆盖
    import('@/utils/sync').then(({ syncToServer }) => syncToServer());
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

  const updateWidget = (id: string, updates: Partial<DashboardWidget>) => {
    saveLayout(layout.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  return {
    layout,
    isEditing,
    setIsEditing,
    addWidget,
    removeWidget,
    moveWidget,
    updateWidget,
    isInitialized,
    saveLayout,
  };
}
