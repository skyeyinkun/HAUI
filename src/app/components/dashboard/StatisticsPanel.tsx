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

import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { SortableWidget } from './SortableWidget';
import { useLongPress } from '@/hooks/useLongPress';
import { getAvailableWidgets, getWidgetGridClasses } from './widgetRegistry';

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

  const availableWidgets = getAvailableWidgets();

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
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent rounded-xl transition-all text-left group"
                      onClick={() => {
                        addWidget(widget.type, widget.label);
                        setAddPopoverOpen(false);
                      }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                         <widget.icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-foreground truncate">{widget.label}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">{widget.desc}</span>
                      </div>
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
              // 从注册表和自定义配置中获取网格类
              const gridClassName = getWidgetGridClasses(widget.type, widget.w, widget.h);
              let renderContent = null;

              switch (widget.type) {
                case 'weather':
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
                  renderContent = <EnergyWidget />;
                  break;
                case 'indoor':
                  renderContent = (
                    <IndoorEnvironmentCard
                      cardId={widget.id}
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
                  renderContent = (
                    <div className="h-full bg-card rounded-[16px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] border-0 overflow-hidden">
                       <SensorStatusCard
                          cardId={widget.id}
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
                  renderContent = (
                    <div className="bg-muted w-full h-full rounded-[16px] flex items-center justify-center text-xs text-muted-foreground">
                      未知组件: {widget.type}
                    </div>
                  );
              }

              return (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isEditing={isEditing}
                  onRemove={removeWidget}
                  className={`${gridClassName} p-0.5`}
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
        <div 
          className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed border-border/40 rounded-[28px] text-muted-foreground/50 w-full animate-in fade-in transition-colors hover:border-primary/30 hover:bg-accent/5 focus:outline-none" 
          onClick={() => {
            window.navigator?.vibrate?.(50);
            setIsEditing(true);
          }}
          tabIndex={0}
          role="button"
          aria-label="长按进入编辑模式添加小组件"
        >
           <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
           </div>
           <p className="text-sm font-medium">长按或点击此处进入编辑模式添加小组件</p>
        </div>
      )}
    </div>
  );
}
