import { useEffect, useCallback, useRef } from 'react';
import { HassEntities } from 'home-assistant-js-websocket';
import { HAConfig } from '@/types/home-assistant';
import { Device } from '@/types/device';
import { User } from '@/types/user';
import { syncDevicesWithEntities } from '@/utils/device-sync';
import { discoverDevicesFromStates } from '@/utils/device-discovery';
import { cleanLogMessage } from '@/utils/log-helper';
import { logger } from '@/utils/logger';

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
  
  // 使用 ref 保存配置值，避免对象引用变化导致的重复触发
  const deviceMappingsRef = useRef(haConfig.deviceMappings);
  const personMappingsRef = useRef(haConfig.personMappings);
  
  // 仅在值真正变化时更新 ref
  useEffect(() => {
    deviceMappingsRef.current = haConfig.deviceMappings;
  }, [haConfig.deviceMappings]);
  
  useEffect(() => {
    personMappingsRef.current = haConfig.personMappings;
  }, [haConfig.personMappings]);

  // 同步设备与 HA 实体状态
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setDevices((prevDevices: Device[]) => 
      syncDevicesWithEntities(prevDevices, entities, deviceMappingsRef.current)
    );
    // 注意：使用 ref 避免依赖项变化导致的重复执行
  }, [entities, isConnected, setDevices]);

  // 定期强制刷新设备状态（每 15 秒），确保所有设备状态保持同步
  // 这可以处理 WebSocket 事件可能丢失的情况
  useEffect(() => {
    if (!isConnected) return;

    const intervalId = setInterval(() => {
      logger.debug('强制刷新设备状态...');
      setDevices((prevDevices: Device[]) => 
        syncDevicesWithEntities(prevDevices, entities, deviceMappingsRef.current)
      );
    }, 15000); // 15 秒间隔，提升实时性

    return () => clearInterval(intervalId);
  }, [isConnected, entities, setDevices]);

  // 同步用户与 HA person 实体
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setUsers((prevUsers: User[]) => {
      const personEntities = Object.values(entities).filter(e => 
        e.entity_id.startsWith('person.')
      );

      // 辅助函数：判断用户是否在线（考虑多种状态值）
      const isUserOnline = (state: string | undefined): boolean => {
        // 'home' 明确表示在家/在线
        // 'unknown' 或 'unavailable' 保持原有状态不变（由调用方处理）
        return state === 'home';
      };

      // 辅助函数：判断实体状态是否有效（非未知/不可用）
      const isEntityStateValid = (state: string | undefined): boolean => {
        return state !== undefined && state !== 'unknown' && state !== 'unavailable';
      };

      // 1. 初始自动发现如果为空
      if (prevUsers.length === 0 && personEntities.length > 0) {
        const newUsers = personEntities.map(e => {
          const avatar = e.attributes.entity_picture || '';
          const state = e.state;
          // 只有状态有效时才判断在线状态，否则默认为离线
          const online = isEntityStateValid(state) ? isUserOnline(state) : false;
          
          return {
            name: e.attributes.friendly_name || e.entity_id.split('.')[1],
            avatar: avatar.startsWith('/api/') ? `/ha-api${avatar}` : avatar,
            online
          };
        });

        // 异步更新映射以避免渲染期间更新状态
        // 使用 ref 标记避免重复保存，防止循环更新
        const newMappings = { ...personMappingsRef.current };
        newUsers.forEach(u => {
          const entity = personEntities.find(pe => 
            (pe.attributes.friendly_name || pe.entity_id.split('.')[1]) === u.name
          );
          if (entity) newMappings[u.name] = entity.entity_id;
        });

        // 只在映射发生变化时才保存配置
        const hasMappingChanged = JSON.stringify(newMappings) !== JSON.stringify(personMappingsRef.current);
        if (hasMappingChanged) {
          setTimeout(() => {
            saveConfig({ ...haConfig, personMappings: newMappings });
          }, 0);
        }

        return newUsers;
      }

      // 2. 常规同步状态和头像
      let changed = false;
      const syncedUsers = prevUsers.map(u => {
        const entityId = personMappingsRef.current[u.name];
        const entity = entityId 
          ? entities[entityId] 
          : personEntities.find(e => e.attributes.friendly_name === u.name);

        if (entity) {
          const state = entity.state;
          // 只有状态有效时才更新在线状态，避免 unknown/unavailable 覆盖有效状态
          const currentOnline = isEntityStateValid(state) 
            ? isUserOnline(state) 
            : u.online; // 保持原有状态
          
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
    // 注意：使用 ref 避免依赖项变化导致的重复执行
  }, [entities, isConnected, setUsers, saveConfig]);

  // 同步 HA 事件到 Dashboard 日志
  useEffect(() => {
    if (events.length === 0) return;

    const latestEvent = events[0];
    if (latestEvent.type === 'state_changed') {
      const { entity_id, new_state } = latestEvent.data;
      if (new_state) {
        // 尝试从设备列表查找友好名称
        const deviceId = Object.keys(deviceMappingsRef.current).find(
          key => deviceMappingsRef.current[key as any] === entity_id
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
    // 注意：使用 ref 避免依赖项变化导致的重复执行
  }, [events, devices, addLog]);

  // 自动扫描设备
  const handleAutoScan = useCallback(async (retryCount = 0) => {
    if (!isConnected) return;
    
    try {
      const states = await fetchStatesRest();
      const entitiesObj: HassEntities = {};
      if (Array.isArray(states)) {
        states.forEach((s) => { 
          const entity = s as { entity_id: string; [key: string]: unknown };
          entitiesObj[entity.entity_id] = entity as HassEntities[string]; 
        });
      } else {
        Object.assign(entitiesObj, states);
      }

      // 使用函数式状态更新确保获取最新设备列表
      setDevices((currentDevices: Device[]) => {
        const { newCount } = discoverDevicesFromStates(
          entitiesObj, 
          currentDevices, 
          deviceMappingsRef.current
        );

        if (newCount > 0) {
          // 可选：通知用户有新设备可用
          logger.info(`发现 ${newCount} 个新设备，请在"设备管理"中查看`);
        }
        return currentDevices;
      });
    } catch (e) {
      logger.error('自动扫描失败', e);
      if (retryCount < 1) {
        setTimeout(() => handleAutoScan(retryCount + 1), 3000);
      }
    }
    // 注意：使用 ref 避免依赖项变化导致的重复执行
  }, [isConnected, fetchStatesRest, setDevices]);

  // 连接成功后执行自动扫描和配置同步
  useEffect(() => {
    if (isConnected && !hasScannedRef.current) {
      hasScannedRef.current = true;
      
      // 立即执行一次设备状态同步，确保首次连接后设备状态是最新的
      setDevices((prevDevices: Device[]) => 
        syncDevicesWithEntities(prevDevices, entities, deviceMappingsRef.current)
      );
      
      // 延迟 2 秒后执行自动扫描，稍微缓解连接刚建立时的拥塞
      const scanTimer = setTimeout(() => {
        handleAutoScan();
      }, 2000);
      
      // 延迟 4 秒后开启配置同步，优先保证设备状态同步
      const syncTimer = setTimeout(() => {
        import('@/utils/sync').then(({ syncFromServer, initAutoSync }) => {
          // 先触发一次全量对齐（非强制，避免不必要的更新）
          syncFromServer(false).then((synced) => {
            if (synced) {
              logger.debug('连接成功后已同步服务端数据');
              // 不再触发 haui-sync-complete 事件，避免潜在的循环
              // dataStore 的 persist 中间件会自动处理数据恢复
            }
          });
          // 启动心跳（20s）与聚焦触发 - 缩短心跳间隔提升实时性
          const cleanup = initAutoSync();
          return cleanup;
        });
      }, 4000);
      
      return () => {
        clearTimeout(scanTimer);
        clearTimeout(syncTimer);
      };
    }
  }, [isConnected, handleAutoScan, entities, setDevices]);

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
