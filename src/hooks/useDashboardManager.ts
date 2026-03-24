import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataStore } from '@/store/dataStore';
import { useUIStore } from '@/store/uiStore';
import { HAConfig } from '@/types/home-assistant';
import { Device } from '@/types/device';
import { HassEntities } from 'home-assistant-js-websocket';
import { syncDevicesWithEntities } from '@/utils/device-sync';
import { discoverDevicesFromStates } from '@/utils/device-discovery';
import { cleanLogMessage } from '@/utils/log-helper';
import { emitIrTelemetry } from '@/utils/ir-telemetry';

/**
 * 仪表盘管理 Hook
 * 封装仪表盘的核心业务逻辑，包括：
 * - 设备状态管理
 * - 房间/场景切换
 * - 设备操作（开关、位置调整、亮度调节）
 * - 事件日志处理
 * 
 * 优化说明：
 * - 将 App.tsx 中的大量业务逻辑提取到此 Hook 中
 * - 使用 useCallback 缓存处理函数，避免不必要的重新渲染
 * - 将复杂的状态更新逻辑集中管理，提高可维护性
 */
export function useDashboardManager(
  haConfig: HAConfig,
  entities: HassEntities,
  isConnected: boolean,
  callService: (domain: string, service: string, data?: any) => Promise<any>
) {
  // ============ 状态管理 ============
  const {
    devices, setDevices,
    users, setUsers,
    addLog
  } = useDataStore();

  const {
    dashboardEditing, setDashboardEditing,
    selectedClimateDevice, setSelectedClimateDevice
  } = useUIStore();

  // 房间选择状态
  const [selectedRoom, setSelectedRoom] = useState<string>('常用');
  const [sceneCooldown, setSceneCooldown] = useState(false);

  // 引用：避免闭包问题
  const configRef = useRef(haConfig);
  const isConnectedRef = useRef(isConnected);
  const callServiceRef = useRef(callService);

  // 保持引用最新
  useEffect(() => {
    configRef.current = haConfig;
    isConnectedRef.current = isConnected;
    callServiceRef.current = callService;
  }, [haConfig, isConnected, callService]);

  // ============ 设备过滤 ============
  // 使用 useMemo 缓存过滤结果，避免每次渲染都重新计算
  const filteredDevices = useCallback(() => {
    if (selectedRoom === '常用') {
      return dashboardEditing ? devices : devices.filter(d => d.isCommon);
    }
    return devices.filter(d => d.room === selectedRoom);
  }, [devices, selectedRoom, dashboardEditing])();

  // ============ 设备同步 Effect ============
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setDevices(prevDevices => 
      syncDevicesWithEntities(prevDevices, entities, configRef.current.deviceMappings)
    );
  }, [entities, isConnected, setDevices]);

  // ============ 用户同步 Effect ============
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setUsers(prevUsers => {
      const personEntities = Object.values(entities).filter(
        e => e.entity_id.startsWith('person.')
      );

      // 首次自动发现
      if (prevUsers.length === 0 && personEntities.length > 0) {
        const newUsers = personEntities.map(e => {
          const avatar = e.attributes.entity_picture || '';
          return {
            name: e.attributes.friendly_name || e.entity_id.split('.')[1],
            avatar: avatar.startsWith('/api/') ? `/ha-api${avatar}` : avatar,
            online: e.state === 'home'
          };
        });

        // 异步更新映射
        const newMappings = { ...configRef.current.personMappings };
        newUsers.forEach(u => {
          const entity = personEntities.find(
            pe => (pe.attributes.friendly_name || pe.entity_id.split('.')[1]) === u.name
          );
          if (entity) newMappings[u.name] = entity.entity_id;
        });

        // 延迟保存配置
        setTimeout(() => {
          // 保存映射的逻辑应该由调用方处理
        }, 0);

        return newUsers;
      }

      // 常规同步状态和头像
      let changed = false;
      const syncedUsers = prevUsers.map(u => {
        const entityId = configRef.current.personMappings[u.name];
        const entity = entityId 
          ? entities[entityId] 
          : personEntities.find(e => (e.attributes.friendly_name === u.name));

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
  }, [entities, isConnected, setUsers]);

  // ============ 设备操作函数 ============

  // 开关设备
  const toggleDevice = useCallback((id: number) => {
    setDevices(prev => prev.map(device => {
      if (device.id !== id) return device;
      
      const newState = !device.isOn;
      const entityId = configRef.current.deviceMappings[id];

      // 调用 Home Assistant 服务
      if (entityId) {
        const domain = entityId.split('.')[0];
        let service = 'toggle';
        const serviceData: Record<string, unknown> = { entity_id: entityId };

        if (domain === 'cover') {
          service = newState ? 'open_cover' : 'close_cover';
        } else if (domain === 'light' || domain === 'switch') {
          service = newState ? 'turn_on' : 'turn_off';
        }

        callServiceRef.current(domain, service, serviceData).catch(err => {
          console.error(`Failed to toggle ${entityId}`, err);
        });
      }

      // 生成日志消息
      let message = '';
      if (device.type === 'light') {
        message = `${device.name} ${newState ? '打开了' : '关闭了'}`;
      } else if (device.icon === 'motion' || device.name.includes('人体')) {
        message = `${device.name} ${newState ? '触发了' : '恢复正常'}`;
      } else if (device.icon === 'door' || device.name.includes('门')) {
        message = `${device.name} ${newState ? '打开了' : '关闭了'}`;
      } else if (device.type === 'curtain') {
        message = `${device.name} ${newState ? '打开了' : '关闭了'}`;
      } else {
        message = `${device.name} ${newState ? '开启' : '关闭'}`;
      }

      // 添加日志
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      addLog({ time: timeString, message });

      // 根据设备类型更新状态
      if (device.type === 'curtain') {
        return { ...device, isOn: newState, position: newState ? 100 : 0 };
      }
      if (device.type === 'light' && !newState) {
        return { ...device, isOn: newState, brightness: 0 };
      }
      return { ...device, isOn: newState };
    }));
  }, [setDevices, addLog]);

  // 调整窗帘位置
  const handlePositionChange = useCallback((id: number, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    const entityId = configRef.current.deviceMappings[id];

    // 调用 HA 服务
    if (entityId && entityId.startsWith('cover.')) {
      callServiceRef.current('cover', 'set_cover_position', {
        entity_id: entityId,
        position: val
      }).catch(console.error);
    }

    setDevices(prev => prev.map(device => {
      if (device.id !== id || device.type !== 'curtain') return device;
      
      const isOn = val > 0;
      
      // 未连接时记录日志
      if (!isConnectedRef.current) {
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        addLog({ time: timeString, message: `${device.name} 开度调整为 ${val}%` });
      }

      return { ...device, position: val, isOn };
    }));
  }, [setDevices, addLog]);

  // 更新灯光设置
  const handleLightUpdate = useCallback((deviceId: number, updates: Record<string, unknown>) => {
    const entityId = configRef.current.deviceMappings[deviceId];
    if (!entityId) return;

    if (updates.brightness !== undefined) {
      const brightness = Math.max(0, Math.min(255, Math.round(updates.brightness as number)));
      callServiceRef.current('light', 'turn_on', {
        entity_id: entityId,
        brightness
      }).catch(console.error);
    }

    if (updates.color_temp !== undefined) {
      callServiceRef.current('light', 'turn_on', {
        entity_id: entityId,
        color_temp: updates.color_temp
      }).catch(console.error);
    }
  }, []);

  // 切换常用设备
  const toggleCommon = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDevices(prev => prev.map(device =>
      device.id === id ? { ...device, isCommon: !device.isCommon } : device
    ));
  }, [setDevices]);

  // 发送红外命令
  const sendIR = useCallback((deviceId: number, code: string) => {
    const entityId = configRef.current.deviceMappings[deviceId];

    if (!entityId) {
      console.warn('[IR] No mapped entity_id for device', { deviceId, code });
      emitIrTelemetry({ deviceId, entityId: null, code, ok: false });
      return;
    }

    emitIrTelemetry({ deviceId, entityId, code, ok: true });

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    addLog({ time: timeString, message: `IR ${code} → ${entityId}` });

    callServiceRef.current('remote', 'send_command', { 
      entity_id: entityId, 
      command: code 
    }).catch(err => {
      console.error('[IR] send failed', err);
      emitIrTelemetry({ deviceId, entityId, code, ok: false, error: String(err?.message || err) });
    });
  }, [addLog]);

  // 处理设备点击（打开详情弹窗）
  const handleDeviceClick = useCallback((device: Device) => {
    if (device.type === 'ac' || device.type === 'climate' || device.type === 'heater' || device.type === 'fan') {
      setSelectedClimateDevice(device);
    }
  }, [setSelectedClimateDevice]);

  // 处理设备开关
  const handleDeviceToggle = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    toggleDevice(id);
  }, [toggleDevice]);

  // ============ 返回值 ============
  return {
    // 状态
    selectedRoom,
    setSelectedRoom,
    sceneCooldown,
    setSceneCooldown,
    dashboardEditing,
    setDashboardEditing,
    
    // 数据
    filteredDevices,
    devices,
    
    // 操作函数
    toggleDevice,
    handlePositionChange,
    handleLightUpdate,
    toggleCommon,
    sendIR,
    handleDeviceClick,
    handleDeviceToggle,
  };
}
