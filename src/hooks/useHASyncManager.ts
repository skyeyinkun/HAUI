import { useEffect, useCallback, useRef } from 'react';
import { HassEntities } from 'home-assistant-js-websocket';
import { HAConfig } from '@/types/home-assistant';
import { Device } from '@/types/device';
import { User } from '@/types/user';
import { syncDevicesWithEntities } from '@/utils/device-sync';
import { discoverDevicesFromStates } from '@/utils/device-discovery';
import { cleanLogMessage } from '@/utils/log-helper';

interface UseHASyncManagerProps {
  isConnected: boolean;
  entities: HassEntities;
  events: any[];
  haConfig: HAConfig;
  devices: Device[];
  setDevices: (devices: Device[] | ((prev: Device[]) => Device[])) => void;
  setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
  addLog: (log: { time: string; message: string }) => void;
  saveConfig: (config: HAConfig) => void;
  fetchStatesRest: () => Promise<any>;
}

/**
 * HA 同步管理器 Hook
 * 负责 WebSocket 事件监听、设备状态同步、用户同步、自动扫描等逻辑
 * 从 App.tsx 解耦，实现单一职责原则
 */
export function useHASyncManager({
  isConnected,
  entities,
  events,
  haConfig,
  devices,
  setDevices,
  setUsers,
  addLog,
  saveConfig,
  fetchStatesRest,
}: UseHASyncManagerProps) {
  const hasScannedRef = useRef(false);

  // 同步设备与 HA 实体状态
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setDevices((prevDevices: Device[]) => 
      syncDevicesWithEntities(prevDevices, entities, haConfig.deviceMappings)
    );
  }, [entities, haConfig.deviceMappings, isConnected, setDevices]);

  // 同步用户与 HA person 实体
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setUsers((prevUsers: User[]) => {
      const personEntities = Object.values(entities).filter(e => 
        e.entity_id.startsWith('person.')
      );

      // 1. 初始自动发现如果为空
      if (prevUsers.length === 0 && personEntities.length > 0) {
        const newUsers = personEntities.map(e => {
          const avatar = e.attributes.entity_picture || '';
          return {
            name: e.attributes.friendly_name || e.entity_id.split('.')[1],
            avatar: avatar.startsWith('/api/') ? `/ha-api${avatar}` : avatar,
            online: e.state === 'home'
          };
        });

        // 异步更新映射以避免渲染期间更新状态
        const newMappings = { ...haConfig.personMappings };
        newUsers.forEach(u => {
          const entity = personEntities.find(pe => 
            (pe.attributes.friendly_name || pe.entity_id.split('.')[1]) === u.name
          );
          if (entity) newMappings[u.name] = entity.entity_id;
        });

        setTimeout(() => {
          saveConfig({ ...haConfig, personMappings: newMappings });
        }, 0);

        return newUsers;
      }

      // 2. 常规同步状态和头像
      let changed = false;
      const syncedUsers = prevUsers.map(u => {
        const entityId = haConfig.personMappings[u.name];
        const entity = entityId 
          ? entities[entityId] 
          : personEntities.find(e => e.attributes.friendly_name === u.name);

        if (entity) {
          const currentOnline = entity.state === 'home';
          let avatar = entity.attributes.entity_picture || '';
          if (avatar.startsWith('/api/')) avatar = `/ha-api${avatar}`;

          if (u.online !== currentOnline || (!u.isLocalAvatar && avatar && u.avatar !== avatar)) {
            changed = true;
            return {
              ...u,
              online: currentOnline,
              avatar: u.isLocalAvatar ? u.avatar : (avatar || u.avatar)
            };
          }
        }
        return u;
      });

      return changed ? syncedUsers : prevUsers;
    });
  }, [entities, isConnected, haConfig.personMappings, setUsers, saveConfig]);

  // 同步 HA 事件到 Dashboard 日志
  useEffect(() => {
    if (events.length === 0) return;

    const latestEvent = events[0];
    if (latestEvent.type === 'state_changed') {
      const { entity_id, new_state } = latestEvent.data;
      if (new_state) {
        // 尝试从设备列表查找友好名称
        const deviceId = Object.keys(haConfig.deviceMappings).find(
          key => haConfig.deviceMappings[key as any] === entity_id
        );
        let name = entity_id;

        if (deviceId) {
          const device = devices.find(d => d.id === parseInt(deviceId));
          if (device) name = device.name;
        } else if (new_state.attributes.friendly_name) {
          name = new_state.attributes.friendly_name;
        }

        const rawState = new_state.state;
        const state = rawState === 'on' ? '打开' : 
                     rawState === 'off' ? '关闭' : rawState;
        const timeString = new Date().toLocaleTimeString();

        const rawMessage = `${name} 状态变更为 ${state}`;
        const cleanedMessage = cleanLogMessage(rawMessage);

        addLog({
          time: timeString,
          message: cleanedMessage
        });
      }
    }
  }, [events, haConfig.deviceMappings, devices, addLog]);

  // 自动扫描设备
  const handleAutoScan = useCallback(async (retryCount = 0) => {
    if (!isConnected) return;
    
    try {
      const states = await fetchStatesRest();
      const entitiesObj: HassEntities = {};
      if (Array.isArray(states)) {
        states.forEach((s: any) => { entitiesObj[s.entity_id] = s; });
      } else {
        Object.assign(entitiesObj, states);
      }

      // 使用函数式状态更新确保获取最新设备列表
      setDevices((currentDevices: Device[]) => {
        const { newCount } = discoverDevicesFromStates(
          entitiesObj, 
          currentDevices, 
          haConfig.deviceMappings
        );

        if (newCount > 0) {
          // 可选：通知用户有新设备可用
          console.log(`发现 ${newCount} 个新设备，请在"设备管理"中查看`);
        }
        return currentDevices;
      });
    } catch (e) {
      console.error('自动扫描失败', e);
      if (retryCount < 1) {
        setTimeout(() => handleAutoScan(retryCount + 1), 3000);
      }
    }
  }, [isConnected, haConfig.deviceMappings, fetchStatesRest, setDevices]);

  // 连接成功后执行自动扫描和配置同步
  useEffect(() => {
    if (isConnected && !hasScannedRef.current) {
      hasScannedRef.current = true;
      handleAutoScan();
      
      // 开启实时配置同步心跳
      import('@/utils/sync').then(({ syncFromServer, initAutoSync }) => {
        // 先触发一次全量对齐（强制）
        syncFromServer(true);
        // 启动心跳（30s）与聚焦触发
        const cleanup = initAutoSync();
        return cleanup;
      });
    }
  }, [isConnected, handleAutoScan]);

  // 重置扫描标志当连接断开时
  useEffect(() => {
    if (!isConnected) {
      hasScannedRef.current = false;
    }
  }, [isConnected]);

  return {
    handleAutoScan,
    hasScanned: hasScannedRef.current,
  };
}
