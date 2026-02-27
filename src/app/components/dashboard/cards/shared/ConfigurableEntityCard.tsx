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
  const [draftConfig, setDraftConfig] = useState<CardConfig>(activeConfig);

  const handleSettingsOpen = useCallback(() => {
    setDraftConfig(activeConfig);
    setSettingsOpen(true);
  }, [activeConfig]);

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
    <div className="entity-card flex-1 bg-card rounded-[16px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.06)] p-3 flex flex-col transition-colors duration-300 relative group overflow-hidden border-0 h-[288px] min-h-[288px]">
      {/* ===== 卡片头部：图标（可点击更换）、标题（可点击编辑）、刷新按钮、设置按钮 ===== */}
      <div className="flex items-center justify-between shrink-0 mb-3">
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
              className="w-7 h-7 rounded-[10px] flex items-center justify-center shadow-[0px_0px_12px_0px_rgba(0,0,0,0.08)] cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
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
              className="w-7 h-7 rounded-full bg-accent/50 border border-white/5 flex items-center justify-center hover:bg-accent/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
            className="w-7 h-7 rounded-full bg-accent/50 border border-white/5 flex items-center justify-center hover:bg-accent/70 transition-colors opacity-0 group-hover:opacity-100"
            title="配置卡片"
          >
            <Settings className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          {props.rightBadge}
        </div>
      </div>

      {/* ===== 实体网格 ===== */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <div className="grid grid-cols-2 gap-2 h-full content-start">
          {entitiesToShow.map(e => {
            const st: any = props.haEntities?.[e.entity_id];
            const displayName = e.display_name || e.ha_name || st?.attributes?.friendly_name || e.entity_id;
            const unit = st?.attributes?.unit_of_measurement ? String(st.attributes.unit_of_measurement) : '';
            const value = formatState(e.entity_id, st?.state);
            const available = st ? st.state !== 'unavailable' : true;
            const iconName = e.icon || 'Activity';

            return (
              <div key={e.entity_id} className="relative flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-300 bg-transparent border-transparent hover:bg-accent/20 min-h-[56px] group/item">
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 transition-colors bg-accent/30 group-hover/item:w-10 group-hover/item:h-10 group-hover/item:bg-accent/50 group-hover/item:shadow-sm duration-300">
                  <CustomIcon name={iconName} className="entity-card__icon text-muted-foreground w-4 h-4 group-hover/item:w-6 group-hover/item:h-6 transition-all duration-300" />
                </div>

                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <span className="entity-card__label font-medium truncate text-muted-foreground leading-tight">{displayName}</span>
                  <div className="flex items-center justify-between gap-1.5 w-full mt-0.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="entity-card__value font-medium leading-none text-muted-foreground">
                        {value}
                        {unit ? ` ${unit}` : ''}
                      </span>
                      <SensorTimestamp lastChanged={st?.last_changed} available={available} nowMs={props.nowMs} variant="compact" />
                    </div>
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
          onDraftChange={setDraftConfig}
          onResetDefault={handleResetDefault}
          onSave={handleSettingsSave}
          fetchStates={props.fetchStates}
        />
      )}
    </div>
  );
}
