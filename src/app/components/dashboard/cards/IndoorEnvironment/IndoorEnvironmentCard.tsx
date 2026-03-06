import React from 'react';
import type { HassEntities } from 'home-assistant-js-websocket';
import type { CardConfig } from '@/types/card-config';
import { ConfigurableEntityCard } from '../shared/ConfigurableEntityCard';
import { Device } from '@/types/device';

// Default config if none exists
const DEFAULT_CONFIG: CardConfig = {
  title: '室内环境',
  icon: 'Thermometer',
  entities: [
    { entity_id: 'sensor.temperature', display_name: '室内温度', icon: 'Thermometer' },
    { entity_id: 'sensor.humidity', display_name: '室内湿度', icon: 'Droplets' },
    { entity_id: 'sensor.co2', display_name: 'CO2浓度', icon: 'CloudFog' },
    { entity_id: 'sensor.pm25', display_name: 'PM2.5', icon: 'Wind' },
  ]
};

interface IndoorEnvironmentCardProps {
  haEntities: HassEntities;
  onRefresh?: () => Promise<void>;
  fetchStates: () => Promise<any[]>;
  persistence?: { baseUrl: string; token: string };
  nowMs: number;
  devices: Device[];
}

export function IndoorEnvironmentCard(props: IndoorEnvironmentCardProps) {
  // Merge default config with device-based config
  const mergedConfig = React.useMemo(() => {
    // 1. Find all devices that are configured to show in 'indoor_environment' or visible by default (and appropriate type)
    const cardDevices = props.devices.filter(d =>
      (d.visibility === 'visible' || d.visibility === undefined) &&
      (d.type === 'sensor' || d.deviceClass === 'temperature' || d.deviceClass === 'humidity' || d.deviceClass === 'co2' || d.deviceClass === 'pm25')
    );

    // 2. Map to entities
    const dynamicEntities = cardDevices.map(d => ({
      entity_id: d.entity_id || '',
      display_name: d.customName || d.name,
      icon: d.customIcon || d.icon,
      visible: d.visibility !== 'hidden'
    })).filter(e => e.entity_id);

    // 3. If no devices found, fallback to default config but respect visibility
    if (dynamicEntities.length === 0) {
      return DEFAULT_CONFIG;
    }

    return {
      ...DEFAULT_CONFIG,
      entities: dynamicEntities
    };
  }, [props.devices]);

  return (
    <ConfigurableEntityCard
      cardId="indoor_environment"
      defaultConfig={mergedConfig}
      haEntities={props.haEntities}
      onRefresh={props.onRefresh}
      fetchStates={props.fetchStates}
      persistence={props.persistence}
      nowMs={props.nowMs}
      rightBadge={
        <div className="flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-medium text-green-600">舒适</span>
        </div>
      }
    />
  );
}
