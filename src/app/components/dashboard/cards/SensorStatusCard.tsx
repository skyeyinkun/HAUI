import { useMemo, useState, useCallback } from 'react';
import { ConfigurableEntityCard } from './shared/ConfigurableEntityCard';
import type { HassEntities } from 'home-assistant-js-websocket';
import { Device } from '@/types/device';
import { LightsOnPopover } from './shared/LightsOnPopover';

// 未配置时的默认实体列表
const DEFAULT_CONFIG = {
  title: '家庭状态',
  icon: 'Activity',
  entities: [
    { entity_id: 'binary_sensor.door_window', display_name: '门窗状态', icon: 'DoorOpen' },
    { entity_id: 'binary_sensor.motion', display_name: '人体移动', icon: 'UserRound' },
    { entity_id: 'binary_sensor.smoke', display_name: '烟雾报警', icon: 'CloudFog' },
    { entity_id: 'binary_sensor.water_leak', display_name: '水浸报警', icon: 'Waves' },
    { entity_id: 'light.all_lights', display_name: '全屋灯光', icon: 'Lightbulb' },
  ]
};

interface SensorStatusCardProps {
  haEntities: HassEntities;
  lightsOn?: number;
  nowMs: number;
  onRefresh?: () => Promise<void>;
  fetchStates: () => Promise<any[]>;
  persistence?: { baseUrl: string; token: string };
  devices: Device[];
  /** 灯光关闭回调：传入设备 ID 触发关灯操作 */
  onToggleLight?: (deviceId: number) => void;
}

export function SensorStatusCard(props: SensorStatusCardProps) {
  const [lightsPopoverOpen, setLightsPopoverOpen] = useState(false);

  // 从设备列表动态构建实体配置
  const mergedConfig = useMemo(() => {
    const cardDevices = props.devices.filter(d =>
      (d.visibility === 'visible' || d.visibility === undefined) &&
      (d.type === 'binary_sensor' || d.type === 'lock' || d.type === 'cover' || (d.type === 'light' && d.isCommon))
    );

    const dynamicEntities = cardDevices.map(d => ({
      entity_id: d.entity_id || '',
      display_name: d.customName || d.name,
      icon: d.customIcon || d.icon,
      visible: d.visibility !== 'hidden'
    })).filter(e => e.entity_id);

    if (dynamicEntities.length === 0) {
      return DEFAULT_CONFIG;
    }

    return {
      ...DEFAULT_CONFIG,
      entities: dynamicEntities
    };
  }, [props.devices]);

  // 筛选当前开着的灯
  const lightsOnDevices = useMemo(() => {
    return props.devices.filter(d => d.type === 'light' && d.isOn);
  }, [props.devices]);

  const lightsOnCount = props.lightsOn ?? lightsOnDevices.length;

  // 关灯回调
  const handleTurnOffLight = useCallback((deviceId: number) => {
    props.onToggleLight?.(deviceId);
  }, [props.onToggleLight]);

  return (
    <ConfigurableEntityCard
      cardId="sensor_status"
      defaultConfig={mergedConfig}
      haEntities={props.haEntities}
      onRefresh={props.onRefresh}
      persistence={props.persistence}
      fetchStates={props.fetchStates}
      nowMs={props.nowMs}
      rightBadge={
        lightsOnCount > 0 ? (
          <LightsOnPopover
            lightsOnDevices={lightsOnDevices}
            onTurnOff={handleTurnOffLight}
            open={lightsPopoverOpen}
            onOpenChange={setLightsPopoverOpen}
          >
            <button
              type="button"
              onClick={() => setLightsPopoverOpen(true)}
              className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors"
              title="点击查看开启的灯光设备"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] font-medium text-amber-600">{lightsOnCount}盏灯开启</span>
            </button>
          </LightsOnPopover>
        ) : (
          <div className="flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-[10px] font-medium text-blue-600">一切正常</span>
          </div>
        )
      }
    />
  );
}
