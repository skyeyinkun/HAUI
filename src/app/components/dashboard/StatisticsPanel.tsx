import React, { useState } from 'react';
import { Loader2, Plus, Check } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { WeatherData } from '@/hooks/useWeather';
import { Device } from '@/types/device';
import { Log } from '@/types/dashboard';
import type { HassEntities } from 'home-assistant-js-websocket';
import { Region } from '@/utils/regions';

import { WeatherWidget } from './widgets/WeatherWidget';
import { EnergyWidget } from './widgets/EnergyWidget';
import { LogsWidget } from './widgets/LogsWidget';
import { IndoorEnvironmentCard } from './cards/IndoorEnvironment/IndoorEnvironmentCard';
import { SensorStatusCard } from './cards/SensorStatusCard';

import { useDashboardLayout, WidgetType } from '@/hooks/useDashboardLayout';
import { SortableWidget } from './SortableWidget';
import { useLongPress } from '@/hooks/useLongPress';

// 弹窗组件导入
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { Button } from '@/app/components/ui/button';

interface StatisticsPanelProps {
  weather: WeatherData | null;
  weatherLoading?: boolean;
  weatherError?: string | null;
  weatherFallback?: boolean;
  lightsOn: number;
  devices: Device[];
  haEntities: HassEntities;
  logs: Log[];
  nowMs: number;
  onRefreshSensors?: () => Promise<void>;
  fetchStates: () => Promise<any[]>;
  persistence?: { baseUrl: string; token: string };
  setLogModalOpen: (open: boolean) => void;
  clearLogs: () => void;
  logContainerRef: React.RefObject<HTMLDivElement>;
  selectedRegion?: { province: Region; city: Region; district: Region };
  onRegionClick?: () => void;
  haBaseUrl?: string;
  haToken?: string;
  onToggleLight?: (deviceId: number) => void;
}

export function StatisticsPanel(props: StatisticsPanelProps) {
  const {
    layout,
    isEditing,
    setIsEditing,
    addWidget,
    removeWidget,
    moveWidget,
    isInitialized
  } = useDashboardLayout();

  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  // DnD 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 避免点击被误认为拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 长按触发编辑模式
  const longPressProps = useLongPress(() => {
    if (!isEditing) {
      window.navigator?.vibrate?.(50); // 提供触觉反馈
      setIsEditing(true);
    }
  }, undefined, { delay: 600 });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layout.findIndex((item) => item.id === active.id);
      const newIndex = layout.findIndex((item) => item.id === over.id);
      moveWidget(oldIndex, newIndex);
    }
  };

  const availableWidgets: { type: WidgetType; label: string; desc: string }[] = [
    { type: 'weather', label: '天气控件', desc: '实时天气与三日预报' },
    { type: 'indoor', label: '室内环境', desc: '汇总全屋温湿度与空气质量' },
    { type: 'energy', label: '能源看板', desc: '全屋能耗与功率统计' },
    { type: 'sensor_status', label: '设备状态', desc: '门窗/人体/水浸等快速纵览' },
    { type: 'logs', label: '实时日志', desc: '监控系统与设备流日志' },
  ];

  if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-[200px] w-full text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        正在加载布局...
      </div>
    );
  }

  return (
    <div className="relative mb-6" {...longPressProps}>
      {/* 顶部编辑模式工具栏 */}
      {isEditing && (
        <div className="absolute -top-12 left-0 right-0 flex justify-between items-center z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="text-sm font-medium bg-background/80 backdrop-blur shadow-sm px-3 py-1.5 rounded-full text-muted-foreground">
            自定义布局模式
          </div>
          <div className="flex gap-2">
            <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="secondary" size="sm" className="rounded-full shadow-lg">
                  <Plus className="w-4 h-4 mr-1" /> 添加面板
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 rounded-xl border border-primary/10 shadow-xl" align="end">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1">可用面板</p>
                  {availableWidgets.map(widget => (
                    <button
                      key={widget.type}
                      className="w-full flex flex-col items-start px-3 py-2 hover:bg-accent rounded-lg transition-colors text-left"
                      onClick={() => {
                        addWidget(widget.type, widget.label);
                        setAddPopoverOpen(false);
                      }}
                    >
                      <span className="text-sm font-medium text-foreground">{widget.label}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">{widget.desc}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Button onClick={() => setIsEditing(false)} variant="default" size="sm" className="rounded-full shadow-lg">
              <Check className="w-4 h-4 mr-1" /> 完成
            </Button>
          </div>
        </div>
      )}

      {/* Grid 布局核心区域 */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ${isEditing ? 'gap-y-4' : ''} auto-rows-[100px] grid-flow-row-dense items-stretch min-h-[300px] transition-all`}>
          <SortableContext items={layout.map(w => w.id)} strategy={rectSortingStrategy}>
            {layout.map((widget) => {
              // 根据组件类型，分配不同尺寸的网格 (Span)
              let className = '';
              let renderContent = null;

              switch (widget.type) {
                case 'weather':
                  className = 'row-span-1 col-span-1';
                  renderContent = (
                    <WeatherWidget
                      weather={props.weather}
                      weatherLoading={props.weatherLoading}
                      weatherError={props.weatherError}
                      weatherFallback={props.weatherFallback}
                      selectedRegion={props.selectedRegion}
                      onRegionClick={props.onRegionClick}
                    />
                  );
                  break;
                case 'energy':
                  className = 'row-span-1 col-span-1';
                  renderContent = <EnergyWidget />;
                  break;
                case 'indoor':
                  className = 'row-span-4 col-span-1'; // Indoor Environment uses 4 rows
                  renderContent = (
                    <IndoorEnvironmentCard
                      haEntities={props.haEntities}
                      onRefresh={props.onRefreshSensors}
                      fetchStates={props.fetchStates}
                      persistence={props.persistence}
                      nowMs={props.nowMs}
                      devices={props.devices}
                    />
                  );
                  break;
                case 'sensor_status':
                  className = 'row-span-4 col-span-1'; // Home Status uses 4 rows
                  renderContent = (
                    <div className="h-full bg-card rounded-[16px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] border-0 overflow-hidden">
                       <SensorStatusCard
                          haEntities={props.haEntities}
                          lightsOn={props.lightsOn}
                          nowMs={props.nowMs}
                          onRefresh={props.onRefreshSensors}
                          fetchStates={props.fetchStates}
                          persistence={props.persistence}
                          devices={props.devices}
                          onToggleLight={props.onToggleLight}
                        />
                    </div>
                  );
                  break;
                case 'logs':
                  className = 'row-span-4 col-span-1 md:col-span-2 lg:col-span-1';
                  renderContent = (
                    <LogsWidget
                      logs={props.logs}
                      setLogModalOpen={props.setLogModalOpen}
                      clearLogs={props.clearLogs}
                      logContainerRef={props.logContainerRef}
                    />
                  );
                  break;
                default:
                  className = 'row-span-1 col-span-1';
                  renderContent = <div className="bg-muted w-full h-full rounded-[16px] flex items-center justify-center text-xs text-muted-foreground">未知组件</div>;
              }

              return (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isEditing={isEditing}
                  onRemove={removeWidget}
                  className={className}
                >
                  {renderContent}
                </SortableWidget>
              );
            })}
          </SortableContext>
        </div>
      </DndContext>

      {/* 当没有任何组件时的占位符 */}
      {layout.length === 0 && !isEditing && (
        <div className="flex flex-col items-center justify-center h-[300px] border-2 border-dashed border-border/50 rounded-[24px] text-muted-foreground/60 w-full animate-in fade-in cursor-pointer" onClick={() => setIsEditing(true)}>
           长按进入编辑模式添加组件
        </div>
      )}
    </div>
  );
}
