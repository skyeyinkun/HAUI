import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Loader2, Settings } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import type { HassEntities } from 'home-assistant-js-websocket';
import type { CardConfig } from '@/types/card-config';
import { SensorTimestamp } from '@/app/components/dashboard/SensorTimestamp';
import { CustomIcon } from './CustomIcon';
import { CardSettingsPanel } from './CardSettingsPanel';
import { IconPickerPopover } from '@/app/components/dashboard/IconPickerPopover';

interface ConfigurableEntityCardProps {
  cardId: string;
  defaultConfig: CardConfig;
  haEntities: HassEntities;
  onRefresh?: () => Promise<void>;
  persistence?: { baseUrl: string; token: string };
  fetchStates: () => Promise<any[]>;
  rightBadge?: React.ReactNode;
  nowMs: number;
  onHeightChange?: (h: number) => void;
}

/** 从 localStorage 读取卡片配置 */
function loadCardConfig(cardId: string): CardConfig | null {
  try {
    const raw = localStorage.getItem(`card_config_${cardId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* 忽略解析错误 */ }
  return null;
}

/** 保存卡片配置到 localStorage */
function saveCardConfig(cardId: string, config: CardConfig) {
  try {
    localStorage.setItem(`card_config_${cardId}`, JSON.stringify(config));
  } catch { /* 忽略写入错误 */ }
}

/** 格式化实体状态文本 */
function formatState(entityId: string, rawState: any) {
  const s = rawState == null ? '' : String(rawState);
  if (!s) return '--';
  if (s === 'unknown') return '--';
  if (s === 'unavailable') return '离线';
  if (entityId.startsWith('binary_sensor.')) {
    if (s === 'on') return '触发';
    if (s === 'off') return '正常';
  }
  if (s === 'on') return '开启';
  if (s === 'off') return '关闭';
  return s;
}

/** 实体视觉状态类型 */
type EntityVisualStatus = 'triggered' | 'normal' | 'active' | 'default';

/** 根据实体 ID 和 HA 状态计算视觉状态 */
function getEntityVisualStatus(entityId: string, state: string | undefined): EntityVisualStatus {
  const isBinary = entityId.startsWith('binary_sensor.');
  if (isBinary && state === 'on') return 'triggered';
  if (isBinary && state === 'off') return 'normal';
  if (!isBinary && state === 'on') return 'active';
  return 'default';
}

/** 视觉状态 → 容器样式映射 */
const STATUS_CONTAINER_STYLES: Record<EntityVisualStatus, string> = {
  triggered: 'bg-red-500/10 border-red-500/20 dark:bg-red-500/15',
  normal: 'bg-emerald-500/8 border-emerald-500/15 dark:bg-emerald-500/10',
  active: 'bg-amber-500/8 border-amber-500/15',
  default: 'bg-accent/5 border-border/5',
};

/** 视觉状态 → 数值文字颜色映射 */
const STATUS_VALUE_STYLES: Record<EntityVisualStatus, string> = {
  triggered: 'text-red-600 dark:text-red-400',
  normal: 'text-emerald-600 dark:text-emerald-400',
  active: 'text-amber-600 dark:text-amber-400',
  default: 'text-foreground',
};

/** 视觉状态 → CustomIcon state 映射 */
const STATUS_ICON_STATE: Record<EntityVisualStatus, 'default' | 'active' | 'alarm'> = {
  triggered: 'alarm',
  normal: 'default',
  active: 'active',
  default: 'default',
};

/** 根据 device_class 和触发状态返回动态图标名称 */
function getStatusIcon(deviceClass: string | undefined, isTriggered: boolean, fallbackIcon: string): string {
  if (!deviceClass) return fallbackIcon;
  switch (deviceClass) {
    case 'door':
    case 'window':
    case 'opening':
    case 'garage_door':
      return isTriggered ? 'DoorOpen' : 'DoorClosed';
    case 'motion':
    case 'occupancy':
    case 'presence':
      return isTriggered ? 'UserCheck' : 'UserRound';
    case 'smoke':
    case 'gas':
    case 'carbon_monoxide':
      return isTriggered ? 'ShieldAlert' : fallbackIcon;
    case 'moisture':
      return isTriggered ? 'Droplets' : fallbackIcon;
    default:
      return fallbackIcon;
  }
}

export function ConfigurableEntityCard(props: ConfigurableEntityCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ===== 配置持久化：从 localStorage 加载，回退到 defaultConfig =====
  const [savedConfig, setSavedConfig] = useState<CardConfig | null>(() => loadCardConfig(props.cardId));
  const activeConfig = savedConfig ?? props.defaultConfig;

  // 当 defaultConfig 变化时（如设备管理修改了设备列表），同步更新
  useEffect(() => {
    if (!savedConfig) return; // 没有保存过配置，始终使用默认
    // 如果 savedConfig.entities 为空但 defaultConfig 有，则合并
    if (savedConfig.entities.length === 0 && props.defaultConfig.entities.length > 0) {
      const merged = { ...savedConfig, entities: props.defaultConfig.entities };
      setSavedConfig(merged);
      saveCardConfig(props.cardId, merged);
    }
  }, [props.defaultConfig.entities]);

  // ===== 内联编辑标题 =====
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(activeConfig.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // 点击标题进入编辑模式
  const startEditTitle = useCallback(() => {
    setTitleDraft(activeConfig.title);
    setIsEditingTitle(true);
    // 等待 DOM 渲染后聚焦
    requestAnimationFrame(() => titleInputRef.current?.focus());
  }, [activeConfig.title]);

  // 确认标题修改
  const confirmTitle = useCallback(() => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== activeConfig.title) {
      const newConfig = { ...activeConfig, title: trimmed };
      setSavedConfig(newConfig);
      saveCardConfig(props.cardId, newConfig);
    }
    setIsEditingTitle(false);
  }, [titleDraft, activeConfig, props.cardId]);

  // ===== 卡片图标更换（使用系统统一图标选择器） =====
  const handleIconChange = useCallback((newIcon: string) => {
    const newConfig = { ...activeConfig, icon: newIcon };
    setSavedConfig(newConfig);
    saveCardConfig(props.cardId, newConfig);
  }, [activeConfig, props.cardId]);

  // ===== 配置面板操作 =====
  const handleSettingsOpen = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleSettingsSave = useCallback(async (next: CardConfig) => {
    setSavedConfig(next);
    saveCardConfig(props.cardId, next);
  }, [props.cardId]);

  const handleResetDefault = useCallback(() => {
    setSavedConfig(null);
    localStorage.removeItem(`card_config_${props.cardId}`);
  }, [props.cardId]);

  // ===== 可见实体列表（最多6个） =====
  const entitiesToShow = useMemo(() => {
    return (activeConfig.entities || []).filter(e => e.visible !== false).slice(0, 6);
  }, [activeConfig.entities]);

  // ===== 动态实体容器：根据卡片内所添加的实体数量来灵活占用卡片高度尺寸 =====
  useEffect(() => {
    if (props.onHeightChange) {
      // 每两列一行
      const rows = Math.ceil(entitiesToShow.length / 2);
      // 卡片头部约占用 40px，每个项目约占用 96px（92px 内容 + 4px 间距，紧凑布局）
      const contentHeight = 40 + (rows * 96);
      // Grid 的 auto-rows 是 100px，加上 gap-3(12px)。 h 行总高度 = h * 100 + (h-1)*12 = h * 112 - 12。
      // 反推需要的行跨度 h：
      const targetH = Math.max(1, Math.min(Math.ceil((contentHeight + 12) / 112), 4));
      props.onHeightChange(targetH);
    }
  }, [entitiesToShow.length, props.onHeightChange]);

  const MainIcon = (LucideIcons as any)[activeConfig.icon || 'Activity'] || LucideIcons.Activity;

  // ===== 刷新：调用 HA 后台获取最新状态 =====
  const handleRefresh = async () => {
    if (!props.onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await props.onRefresh();
    } catch (e: any) {
      setRefreshError(e?.message || '刷新失败');
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshTestId =
    props.cardId === 'indoor_environment'
      ? 'refresh-indoor-environment'
      : props.cardId === 'sensor_status'
        ? 'refresh-sensor-status'
        : undefined;

  const refreshTitle = (() => {
    if (!refreshError) return '点击刷新 Home Assistant 数据';
    if (props.cardId === 'indoor_environment') return `室内环境刷新失败：${refreshError}`;
    if (props.cardId === 'sensor_status') return `传感器刷新失败：${refreshError}`;
    return `刷新失败：${refreshError}`;
  })();

  return (
    <div className="entity-card flex-1 bg-card rounded-[16px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] p-2.5 flex flex-col transition-colors duration-300 relative group overflow-hidden border-0 h-full w-full box-border">
      {/* ===== 卡片头部：图标（可点击更换）、标题（可点击编辑）、刷新按钮、设置按钮 ===== */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* 卡片图标 - 点击弹出系统图标选择器 */}
          <IconPickerPopover
            value={activeConfig.icon || 'Activity'}
            onChange={handleIconChange}
            align="start"
            side="bottom"
          >
            <button
              type="button"
              className="w-6 h-6 rounded-[8px] flex items-center justify-center shadow-[0px_0px_12px_0px_rgba(0,0,0,0.08)] cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
              style={{ backgroundImage: 'linear-gradient(140.848deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)' }}
              title="点击更换图标"
            >
              <MainIcon className="w-3.5 h-3.5 text-white" />
            </button>
          </IconPickerPopover>

          {/* 标题 - 点击进入编辑模式 */}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={confirmTitle}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              maxLength={20}
              className="font-['SF_Pro_Display',sans-serif] text-[14px] text-muted-foreground bg-transparent border-b border-primary/50 focus:border-primary outline-none px-0.5 py-0 w-24 transition-colors"
            />
          ) : (
            <span
              className="font-['SF_Pro_Display',sans-serif] text-[14px] text-muted-foreground truncate cursor-pointer hover:text-foreground transition-colors"
              onClick={startEditTitle}
              title="点击修改标题"
            >
              {activeConfig.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* 刷新按钮 - 调用 HA 后台刷新数值 */}
          {props.onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              className="w-6 h-6 rounded-full bg-accent/50 border border-white/5 flex items-center justify-center hover:bg-accent/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isRefreshing}
              title={refreshTitle}
              data-testid={refreshTestId}
            >
              {isRefreshing ? <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          )}
          {/* 设置按钮 - 打开配置面板 */}
          <button
            type="button"
            onClick={handleSettingsOpen}
            className="w-6 h-6 rounded-full bg-accent/50 border border-white/5 flex items-center justify-center hover:bg-accent/70 transition-colors group-hover:opacity-100"
            title="配置卡片"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {props.rightBadge}
        </div>
      </div>

      {/* ===== 实体网格 ===== */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20 min-h-0">
        <div className="grid grid-cols-2 gap-2 content-start">
          {entitiesToShow.map(e => {
            const st: any = props.haEntities?.[e.entity_id];
            const displayName = e.display_name || e.ha_name || st?.attributes?.friendly_name || e.entity_id;
            const unit = st?.attributes?.unit_of_measurement ? String(st.attributes.unit_of_measurement) : '';
            const value = formatState(e.entity_id, st?.state);
            const available = st ? st.state !== 'unavailable' : true;
            const iconName = e.icon || 'Activity';

            // 计算视觉状态：触发/正常/活跃/默认
            const visualStatus = getEntityVisualStatus(e.entity_id, st?.state);
            const isTriggered = visualStatus === 'triggered';
            const containerStyle = STATUS_CONTAINER_STYLES[visualStatus];
            const valueStyle = STATUS_VALUE_STYLES[visualStatus];
            const iconState = STATUS_ICON_STATE[visualStatus];

            // 根据 device_class 和触发状态动态选择图标
            const deviceClass = st?.attributes?.device_class;
            const dynamicIcon = e.entity_id.startsWith('binary_sensor.')
              ? getStatusIcon(deviceClass, isTriggered, iconName)
              : iconName;

            return (
              <div key={e.entity_id} className={`relative flex flex-col justify-between p-3 rounded-[16px] transition-all duration-300 min-h-[92px] group/item border hover:shadow-sm ${containerStyle} ${isTriggered ? 'animate-sensor-pulse' : ''}`} style={{ contain: 'layout' }}>
                {/* 顶部容器：左方为圆角图标，右方为加亮大字体数值 */}
                <div className="flex items-center justify-between w-full gap-2">
                  <div className={`w-8 h-8 bg-accent/50 rounded-[10px] flex items-center justify-center shrink-0 transition-colors group-hover/item:bg-accent ${isTriggered ? '!bg-red-500/20' : ''}`}>
                    <CustomIcon name={dynamicIcon} state={iconState} className="entity-card__icon w-4 h-4 transition-all duration-300" />
                  </div>
                  <div className="flex items-baseline justify-end flex-1 min-w-0 gap-0.5">
                    <span className={`font-bold ${value.length > 6 ? 'text-[13px]' : 'text-[16px]'} ${valueStyle} tracking-tight leading-none text-right truncate break-all`}>
                      {value}
                    </span>
                    {unit && (
                      <span className="text-[11px] font-medium text-foreground/70 leading-none shrink-0">
                        {unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* 底部容器：实体名称 与 时间标识 */}
                <div className="flex flex-col min-w-0 w-full mt-2">
                  <span className="font-medium text-[12px] text-foreground/90 truncate tracking-wide">{displayName}</span>
                  <div className="flex items-center text-[10px] text-muted-foreground/70 overflow-hidden mt-0.5">
                    <SensorTimestamp lastChanged={st?.last_changed} available={available} nowMs={props.nowMs} variant="compact" className="truncate flex-1 min-w-0 w-full" />
                  </div>
                </div>
              </div>
            );
          })}
          {entitiesToShow.length === 0 && (
            <div className="col-span-2 h-full flex items-center justify-center text-[12px] text-muted-foreground">
              暂无可见实体 (请在设置-设备管理中配置)
            </div>
          )}
        </div>
      </div>

      {/* ===== 配置面板（滑覆在卡片内部） ===== */}
      {settingsOpen && (
        <CardSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          value={activeConfig}
          defaultValue={props.defaultConfig}
          onDraftChange={() => {}}
          onResetDefault={handleResetDefault}
          onSave={handleSettingsSave}
          fetchStates={props.fetchStates}
        />
      )}
    </div>
  );
}
