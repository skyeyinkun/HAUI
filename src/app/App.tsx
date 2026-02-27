import { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';
import { Home, Settings, Moon, Activity, Tv, Book, Users, Coffee, DoorOpen } from 'lucide-react';
import { Toaster } from '@/app/components/ui/sonner';

import SettingsModal from './components/SettingsModal';
import { useWeather } from '@/hooks/useWeather';
import { encryptToken, decryptToken } from '@/utils/security';

import { DeviceCard } from '@/app/components/dashboard/DeviceCard';
import { Header } from '@/app/components/dashboard/Header';
import { StatisticsPanel } from '@/app/components/dashboard/StatisticsPanel';

import AiChatWidget from './components/AiChatWidget';
import { HAConfig } from '@/types/home-assistant';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';
import ClimateControlModal from './components/ClimateControlModal';
import RemoteControlModal from './components/remote/RemoteControlModal';
import LogHistoryModal from './components/LogHistoryModal';
import ApiLogModal from './components/ApiLogModal';
import { useTime } from '@/hooks/useTime';
import { cleanLogMessage } from '@/utils/log-helper';
import { syncDevicesWithEntities } from '@/utils/device-sync';
import { discoverDevicesFromStates } from '@/utils/device-discovery';
import { useNowMs } from '@/hooks/useNowMs';
import { emitIrTelemetry } from '@/utils/ir-telemetry';
import { HassEntities } from 'home-assistant-js-websocket';

import { HashRouter as Router } from 'react-router-dom';


import { RegionSelectorModal } from '@/app/components/dashboard/RegionSelectorModal';
import { DEFAULT_REGION, Region } from '@/utils/regions';
import { getCityCoords } from '@/services/city-coords';

export default function AppWrapper() {
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const hashQuery = hash.includes('?') ? hash.split('?').slice(1).join('?') : '';
  const qs = new URLSearchParams(search || hashQuery);
  const audit = qs.get('audit');

  if (audit === 'remote') {
    return <RemoteAuditScreen />;
  }
  return (
    <Router>
      <App />
    </Router>
  );
}

function RemoteAuditScreen() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-[min(92vw,480px)] aspect-square">
        <DeviceCard
          device={{
            id: 5,
            name: '客厅电视遥控',
            icon: 'remote',
            count: '',
            power: '',
            isOn: false,
            room: '客厅',
            type: 'remote',
            isCommon: true,
          } as any}
          onToggle={() => { }}
          onClick={() => { }}
          onSendIR={(_, code) => {
            emitIrTelemetry({ deviceId: 5, entityId: 'remote.audit', code, ok: true });
          }}
        />
      </div>
    </div>
  );
}

function App() {
  const [selectedRoom, setSelectedRoom] = useState<string>('常用');
  const [sceneCooldown, setSceneCooldown] = useState(false);
  // UI State from Zustand Store
  const {
    settingsOpen, setSettingsOpen,
    settingsDefaultTab, openSettingsAt,
    climateModalOpen, setClimateModalOpen,
    logModalOpen, setLogModalOpen,
    apiLogOpen, setApiLogOpen,
    regionModalOpen, setRegionModalOpen,
    selectedClimateDevice, setSelectedClimateDevice,
    selectedRemoteDevice, setSelectedRemoteDevice
  } = useUIStore();

  const {
    devices, setDevices,
    rooms, setRooms,
    scenes, setScenes,
    users, setUsers,
    logs,
    addLog, clearLogs
  } = useDataStore();
  const [selectedRegion, setSelectedRegion] = useState<{ province: Region; city: Region; district: Region }>(() => {
    try {
      const saved = localStorage.getItem('selected_region');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return DEFAULT_REGION;
  });

  const [isEditingCommon, setIsEditingCommon] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Real-time hooks
  const { formattedTime, formattedDate } = useTime();

  const [weatherCoords, setWeatherCoords] = useState<{ lat: number; lon: number; isFallback: boolean } | null>(() => ({
    lat: DEFAULT_REGION.district.lat!,
    lon: DEFAULT_REGION.district.lon!,
    isFallback: false,
  }));
  const isDefaultRegion = selectedRegion?.district?.code === DEFAULT_REGION.district.code;

  useEffect(() => {
    const districtLat = selectedRegion?.district?.lat;
    const districtLon = selectedRegion?.district?.lon;
    const districtCode = selectedRegion?.district?.code;

    // 1. 默认地区，直接使用默认坐标
    if (isDefaultRegion) {
      setWeatherCoords({
        lat: DEFAULT_REGION.district.lat!,
        lon: DEFAULT_REGION.district.lon!,
        isFallback: false,
      });
      return;
    }

    // 2. 选中地区已有坐标（RegionSelectorModal 已解析），直接使用
    if (typeof districtLat === 'number' && typeof districtLon === 'number') {
      setWeatherCoords({ lat: districtLat, lon: districtLon, isFallback: false });
      return;
    }

    // 3. 选中地区没有坐标，从本地坐标表查询
    if (!districtCode) return;

    const cityName = selectedRegion?.city?.name;
    const districtName = selectedRegion?.district?.name;

    let cancelled = false;
    setWeatherCoords(null); // 触发 loading

    getCityCoords(districtCode).then(coords => {
      if (cancelled) return;
      if (coords) {
        setWeatherCoords({ lat: coords.lat, lon: coords.lon, isFallback: false });
        // 回写坐标到 selectedRegion，下次不再查询
        setSelectedRegion(prev => {
          if (prev?.district?.code !== districtCode) return prev;
          return { ...prev, district: { ...prev.district, lat: coords.lat, lon: coords.lon } };
        });
        addLog({ time: new Date().toTimeString().slice(0, 8), message: `天气坐标已就绪：${cityName || ''}·${districtName || ''}` });
      } else {
        // 查不到坐标，fallback 到默认
        setWeatherCoords({
          lat: DEFAULT_REGION.district.lat!,
          lon: DEFAULT_REGION.district.lon!,
          isFallback: true,
        });
        addLog({ time: new Date().toTimeString().slice(0, 8), message: `未找到 ${districtName || districtCode} 坐标，使用默认位置` });
      }
    });

    return () => { cancelled = true; };
  }, [
    isDefaultRegion,
    selectedRegion?.district?.code,
    selectedRegion?.district?.lat,
    selectedRegion?.district?.lon,
  ]);

  const { weather, loading: weatherLoading, error: weatherError } = useWeather(weatherCoords?.lat, weatherCoords?.lon);

  const nowMs = useNowMs(1000);

  useEffect(() => {
    // Auto scroll logs to top when new log arrives
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem('selected_region', JSON.stringify(selectedRegion));
    } catch {
      // ignore
    }
  }, [selectedRegion]);

  // HA Configuration State
  const [haConfig, setHaConfig] = useState<HAConfig>(() => {
    const saved = localStorage.getItem('ha_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Decrypt token when loading from storage
        return {
          ...parsed,
          token: decryptToken(parsed.token)
        };
      } catch (e) {
        console.error('Failed to parse config', e);
      }
    }
    return {
      localUrl: '',
      publicUrl: '',
      token: '',
      deviceMappings: {},
      personMappings: {},
      sceneMappings: {}
    };
  });

  const saveConfig = useCallback((newConfig: HAConfig) => {
    setHaConfig(newConfig);
    // Encrypt token before saving to storage
    const configToSave = {
      ...newConfig,
      token: encryptToken(newConfig.token)
    };
    localStorage.setItem('ha_config', JSON.stringify(configToSave));
  }, []);



  // Use Home Assistant Hook
  const { entities, callService, isConnected, connectionType, events, refreshEntities, latency, fetchStatesRest, restBaseUrl } = useHomeAssistant(haConfig);
  const hasScannedRef = useRef(false);

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

      // Use functional state update to ensure we have the latest devices
      setDevices(currentDevices => {
        // Note: We only use discovery here to potentially notify or sync, 
        // BUT we do NOT automatically add devices to the persistent list anymore based on user request.
        // "In Device Management, all entity ID devices should default to unbound"
        // So we just log the count or notify, but don't merge them into currentDevices.
        // However, we might want to sync *states* of existing bound devices if discovery provides new metadata.
        // The `syncDevicesWithEntities` effect already handles state sync.
        // So we can just skip auto-adding here.

        const { newCount } = discoverDevicesFromStates(entitiesObj, currentDevices, haConfig.deviceMappings);

        if (newCount > 0) {
          // Optionally notify user that new devices are available in Settings -> Device Management
          // toast.info(`发现 ${newCount} 个新设备，请在“设备管理”中查看`);
        }
        return currentDevices;
      });
    } catch (e) {
      console.error('Auto scan failed', e);
      if (retryCount < 1) {
        setTimeout(() => handleAutoScan(retryCount + 1), 3000);
      } else {
        // Silent fail for auto-scan to avoid annoying user, or show log
        console.error('Auto scan failed after retry');
      }
    }
  }, [isConnected, haConfig, fetchStatesRest, saveConfig]);

  useEffect(() => {
    if (isConnected && !hasScannedRef.current) {
      hasScannedRef.current = true;
      handleAutoScan();
    }
  }, [isConnected, handleAutoScan]);

  // Show setup guide notification if not configured (only once per session)
  useEffect(() => {
    if (!isConnected && !haConfig.token && !sessionStorage.getItem('setup_notified')) {
      const timeString = new Date().toLocaleTimeString();
      addLog({
        time: timeString,
        message: '提示: 请点击右下角设置配置 Home Assistant 连接'
      });
      sessionStorage.setItem('setup_notified', 'true');
    }
  }, [isConnected, haConfig.token]);

  // Sync HA Events to Dashboard Logs
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0];
      if (latestEvent.type === 'state_changed') {
        const { entity_id, new_state } = latestEvent.data;
        if (new_state) {
          // Try to find a friendly name from our devices list first, then entity attributes
          const deviceId = Object.keys(haConfig.deviceMappings).find(key => haConfig.deviceMappings[key as any] === entity_id);
          let name = entity_id;

          if (deviceId) {
            const device = devices.find(d => d.id === parseInt(deviceId));
            if (device) name = device.name;
          } else if (new_state.attributes.friendly_name) {
            name = new_state.attributes.friendly_name;
          }

          const rawState = new_state.state;
          // Pre-translate state if it's a simple match
          const state = rawState === 'on' ? '打开' : rawState === 'off' ? '关闭' : rawState;
          const timeString = new Date().toLocaleTimeString();

          const rawMessage = `${name} 状态变更为 ${state}`;
          const cleanedMessage = cleanLogMessage(rawMessage);

          addLog({
            time: timeString,
            message: cleanedMessage
          });
        }
      }
    }
  }, [events, haConfig.deviceMappings, devices]); // Depend on events update and devices









  // Sync devices with HA entities
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setDevices(prevDevices => syncDevicesWithEntities(prevDevices, entities, haConfig.deviceMappings));
  }, [entities, haConfig.deviceMappings, isConnected]);

  // Sync users with HA person entities
  useEffect(() => {
    if (!isConnected || Object.keys(entities).length === 0) return;

    setUsers(prevUsers => {
      const personEntities = Object.values(entities).filter(e => e.entity_id.startsWith('person.'));

      // 1. Initial auto-discovery if empty
      if (prevUsers.length === 0 && personEntities.length > 0) {
        const newUsers = personEntities.map(e => {
          const avatar = e.attributes.entity_picture || '';
          return {
            name: e.attributes.friendly_name || e.entity_id.split('.')[1],
            avatar: avatar.startsWith('/api/') ? `/ha-api${avatar}` : avatar,
            online: e.state === 'home'
          };
        });

        // Update mappings asynchronously to avoid state update during render
        const newMappings = { ...haConfig.personMappings };
        newUsers.forEach(u => {
          const entity = personEntities.find(pe => (pe.attributes.friendly_name || pe.entity_id.split('.')[1]) === u.name);
          if (entity) newMappings[u.name] = entity.entity_id;
        });

        setTimeout(() => {
          saveConfig({ ...haConfig, personMappings: newMappings });
        }, 0);

        return newUsers;
      }

      // 2. Regular sync for status and avatar
      let changed = false;
      const syncedUsers = prevUsers.map(u => {
        const entityId = haConfig.personMappings[u.name];
        // Find by mapping or by friendly name fallback
        const entity = entityId ? entities[entityId] : personEntities.find(e => (e.attributes.friendly_name === u.name));

        if (entity) {
          // Note: online logic - in HA 'home' is definitely online, others might be offline or just 'away'
          // Header.tsx uses user.online to set a green ring.
          // Usually 'home' means present.
          const currentOnline = entity.state === 'home';
          let avatar = entity.attributes.entity_picture || '';
          if (avatar.startsWith('/api/')) avatar = `/ha-api${avatar}`;

          if (u.online !== currentOnline || (avatar && u.avatar !== avatar)) {
            changed = true;
            return {
              ...u,
              online: currentOnline,
              avatar: avatar || u.avatar
            };
          }
        }
        return u;
      });

      return changed ? syncedUsers : prevUsers;
    });
  }, [entities, isConnected, haConfig.personMappings, saveConfig]);


  const handlePositionChange = useCallback((id: number, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;

    // HA Integration
    const entityId = haConfig.deviceMappings[id];
    if (entityId && entityId.startsWith('cover.')) {
      callService('cover', 'set_cover_position', {
        entity_id: entityId,
        position: val
      }).catch(console.error);
    }

    setDevices(prev => prev.map(device => {
      if (device.id === id && device.type === 'curtain') {
        const newPosition = val; // Direct value setting
        const isOn = newPosition > 0;

        // Log only if not connected (optimistic)
        if (!isConnected) {
          const now = new Date();
          const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          const message = `${device.name} 开度调整为 ${newPosition}%`;

          addLog({
            time: timeString,
            message: message
          });
        }

        return { ...device, position: newPosition, isOn };
      }
      return device;
    }));
  }, [haConfig.deviceMappings, callService, isConnected]);

  const toggleDevice = useCallback((id: number) => {
    setDevices(prev => prev.map(device => {
      if (device.id === id) {
        const newState = !device.isOn;

        // HA Integration
        const entityId = haConfig.deviceMappings[id];
        if (entityId) {
          const domain = entityId.split('.')[0];
          let service = 'toggle';
          const serviceData: any = { entity_id: entityId };

          if (domain === 'cover') {
            if (newState) {
              service = 'open_cover';
            } else {
              service = 'close_cover';
            }
          } else if (domain === 'light' || domain === 'switch') {
            service = newState ? 'turn_on' : 'turn_off';
          }

          callService(domain, service, serviceData).catch(err => {
            console.error(`Failed to toggle ${entityId}`, err);
          });
        }

        // Generate Log Message based on device type
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

        // Add log
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        addLog({
          time: timeString,
          message: message
        }); // Keep last 50 logs

        // For curtains, sync position with toggle
        if (device.type === 'curtain') {
          return { ...device, isOn: newState, position: newState ? 100 : 0 };
        }

        if (device.type === 'light' && !newState) {
          return { ...device, isOn: newState, brightness: 0 };
        }

        return { ...device, isOn: newState };
      }
      return device;
    }));
  }, [haConfig.deviceMappings, callService]);



  const toggleCommon = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDevices(prev => prev.map(device =>
      device.id === id ? { ...device, isCommon: !device.isCommon } : device
    ));
  }, []);

  const sendIR = useCallback((deviceId: number, code: string) => {
    const entityId = haConfig.deviceMappings[deviceId];

    if (!entityId) {
      console.warn('[IR] No mapped entity_id for device', { deviceId, code });
      emitIrTelemetry({ deviceId, entityId: null, code, ok: false });
      return;
    }

    const okPayload = emitIrTelemetry({ deviceId, entityId, code, ok: true });
    console.info('[IR] send', okPayload);

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    addLog({
      time: timeString,
      message: `IR ${code} → ${entityId}`
    });

    callService('remote', 'send_command', { entity_id: entityId, command: code }).catch(err => {
      console.error('[IR] send failed', err);
      emitIrTelemetry({ deviceId, entityId, code, ok: false, error: String(err?.message || err) });
    });
  }, [haConfig.deviceMappings, callService]);

  const handleLightUpdate = useCallback((deviceId: number, updates: any) => {
    // HA Integration
    const entityId = haConfig.deviceMappings[deviceId];
    if (entityId) {
      if (updates.brightness !== undefined) {
        const brightness = Math.max(0, Math.min(255, Math.round(updates.brightness)));
        callService('light', 'turn_on', {
          entity_id: entityId,
          brightness: brightness
        }).catch(console.error);
      }
      if (updates.color_temp !== undefined) {
        callService('light', 'turn_on', {
          entity_id: entityId,
          color_temp: updates.color_temp
        }).catch(console.error);
      }
      if (updates.isOn !== undefined) {
        callService('light', updates.isOn ? 'turn_on' : 'turn_off', {
          entity_id: entityId
        }).catch(console.error);
      }
    }

    setDevices(prev => prev.map(device =>
      device.id === deviceId ? { ...device, ...updates } : device
    ));
  }, [haConfig.deviceMappings, callService]);

  const handleDeviceClick = useCallback((device: any) => {
    if (device.type === 'ac' || device.type === 'climate' || device.type === 'heater' || device.type === 'fan') {
      setSelectedClimateDevice(device);
      setClimateModalOpen(true);
    } else if (device.type === 'remote') {
      setSelectedRemoteDevice(device);
    } else if (device.type === 'curtain') {
      // Do nothing for curtain click
      return;
    } else {
      toggleDevice(device.id);
    }
  }, [toggleDevice]);

  const handleClimateUpdate = useCallback((deviceId: number, updates: any) => {
    // HA Integration
    const entityId = haConfig.deviceMappings[deviceId];

    if (!entityId) {
      console.warn(`[ClimateControl] No HA entity mapped for device ${deviceId}. Updates will only be local.`);
    }

    if (entityId && entityId.startsWith('climate.')) {
      console.log(`[ClimateControl] Calling service for ${entityId}:`, updates);

      if (updates.temperature) {
        callService('climate', 'set_temperature', {
          entity_id: entityId,
          temperature: updates.temperature
        }).catch(err => console.error(`[ClimateControl] Failed to set temp for ${entityId}:`, err));
      }
      if (updates.mode) {
        callService('climate', 'set_hvac_mode', {
          entity_id: entityId,
          hvac_mode: updates.mode
        }).catch(err => console.error(`[ClimateControl] Failed to set mode for ${entityId}:`, err));
      }
      if (updates.fan_mode) {
        callService('climate', 'set_fan_mode', {
          entity_id: entityId,
          fan_mode: updates.fan_mode
        }).catch(err => console.error(`[ClimateControl] Failed to set fan mode for ${entityId}:`, err));
      }
      if (updates.swing_mode) {
        callService('climate', 'set_swing_mode', {
          entity_id: entityId,
          swing_mode: updates.swing_mode
        }).catch(err => console.error(`[ClimateControl] Failed to set swing mode for ${entityId}:`, err));
      }
      if (updates.timer_minutes !== undefined) {
        console.log(`Timer set to ${updates.timer_minutes} minutes for ${entityId}`);
        // Note: Standard HA Climate entity doesn't support timer natively.
        // This would typically trigger an automation or script.
      }
    }

    setDevices(prev => prev.map(device =>
      device.id === deviceId ? { ...device, ...updates } : device
    ));
  }, [haConfig.deviceMappings, callService]);

  const toggleScene = useCallback((id: number) => {
    if (sceneCooldown) return;

    // Set active
    setScenes(prev => prev.map(scene =>
      scene.id === id ? { ...scene, isActive: true } : { ...scene, isActive: false }
    ));

    // HA Integration for Scenes
    // Use configured mapping if available, otherwise try friendly name match
    const sceneName = scenes.find(s => s.id === id)?.name;
    let entityIdToCall: string | undefined;

    if (sceneName) {
      entityIdToCall = haConfig.sceneMappings?.[sceneName];

      if (!entityIdToCall) {
        // Fallback to simple heuristic: find entity with friendly_name matching scene.name
        const sceneEntity = Object.values(entities).find(e =>
          e.entity_id.startsWith('scene.') && e.attributes.friendly_name === sceneName
        );
        entityIdToCall = sceneEntity?.entity_id;
      }
    }

    if (entityIdToCall) {
      callService('scene', 'turn_on', { entity_id: entityIdToCall as string })
        .catch(console.error);
    } else {
      console.warn('No matching scene entity found for', scenes.find(s => s.id === id)?.name);
    }

    setSceneCooldown(true);

    // Revert after 3 seconds
    setTimeout(() => {
      setScenes(prev => prev.map(scene =>
        scene.id === id ? { ...scene, isActive: false } : scene
      ));
      setSceneCooldown(false);
    }, 3000);
  }, [sceneCooldown, scenes, haConfig.sceneMappings, entities, callService]);

  const handleUpdateScenes = useCallback((updatedScenes: { id: number; name: string; }[]) => {
    setScenes(prev => {
      return updatedScenes.map(newScene => {
        const existing = prev.find(p => p.id === newScene.id);
        return {
          id: newScene.id,
          name: newScene.name,
          isActive: existing ? existing.isActive : false,
          icon: existing ? existing.icon : 'activity'
        };
      });
    });
  }, []);

  // 统计数据
  const lightsOn = devices.filter(d => d.type === 'light' && d.isOn).length;
  // const totalLights = devices.filter(d => d.type === 'light').length;
  // const doorsOpen = devices.filter(d => d.icon === 'door' && d.isOn).length;
  // const curtainsOpen = devices.filter(d => d.type === 'curtain' && d.isOn).length;
  // const waterLeakDetected = devices.filter(d => d.icon === 'water' && d.isOn).length;
  // const motionDetected = devices.filter(d => d.icon === 'motion' && d.isOn).length;

  // Filter for grid view
  const filteredDevices = selectedRoom === '常用'
    ? (isEditingCommon ? devices : devices.filter(d => d.isCommon))
    : devices.filter(d => d.room === selectedRoom);

  return (
    <div data-testid="dashboard-container" className="h-screen bg-background text-foreground relative transition-colors duration-300 flex flex-col overflow-hidden">
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        devices={devices}
        users={users}
        rooms={rooms}
        onUpdateUsers={setUsers}
        onUpdateDevices={setDevices}
        onUpdateScenes={handleUpdateScenes}
        onUpdateRooms={setRooms}
        scenes={scenes}
        onSave={saveConfig}
        initialConfig={haConfig}
        entities={entities}
        fetchStates={fetchStatesRest}
        defaultTab={settingsDefaultTab}
      />

      <ApiLogModal
        isOpen={apiLogOpen}
        onClose={() => setApiLogOpen(false)}
        logs={events}
      />

      {selectedClimateDevice && (
        <ClimateControlModal
          isOpen={climateModalOpen}
          onClose={() => setClimateModalOpen(false)}
          device={selectedClimateDevice}
          onUpdate={handleClimateUpdate}
        />
      )}

      {selectedRemoteDevice && (
        <RemoteControlModal
          isOpen={!!selectedRemoteDevice}
          onClose={() => setSelectedRemoteDevice(null)}
          device={selectedRemoteDevice}
          callService={callService}
          entities={entities}
        />
      )}

      <LogHistoryModal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        logs={logs}
        onClear={clearLogs}
      />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto w-full">
        {/* Main Content */}
        <div className="w-full max-w-[2400px] mx-auto px-4 md:px-6 lg:px-8 py-8">
          {/* Header */}
          <Header
            weather={weather}
            formattedTime={formattedTime}
            formattedDate={formattedDate}
            users={users}
            haConfig={haConfig}
            isConnected={isConnected}
            connectionType={connectionType}
            onRefresh={() => {
              refreshEntities?.().catch(() => { });
            }}
            latency={latency}
          />

          {/* Statistics Panel - Smaller */}
          <StatisticsPanel
            weather={weather}
            weatherLoading={weatherLoading}
            weatherError={weatherError}
            weatherFallback={!isDefaultRegion && (weatherCoords?.isFallback ?? false)}
            lightsOn={lightsOn}
            devices={devices}
            haEntities={entities}
            logs={logs}
            nowMs={nowMs}
            onRefreshSensors={refreshEntities}
            fetchStates={fetchStatesRest}
            persistence={haConfig.token ? { baseUrl: restBaseUrl || '/ha-api', token: haConfig.token } : undefined}
            setLogModalOpen={setLogModalOpen}
            clearLogs={clearLogs}
            logContainerRef={logContainerRef as React.RefObject<HTMLDivElement>}
            selectedRegion={selectedRegion}
            onRegionClick={() => setRegionModalOpen(true)}
            haBaseUrl={restBaseUrl || '/ha-api'}
            haToken={haConfig.token}
            onToggleLight={toggleDevice}
            onOpenCameraSettings={openSettingsAt}
          />

          <RegionSelectorModal
            open={regionModalOpen}
            onOpenChange={setRegionModalOpen}
            onSelect={(r) => {
              setSelectedRegion(r);
              // 写日志用于监控
              const now = new Date();
              const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
              addLog({
                time,
                message: `地区已更新：${r.city.name}·${r.district.name}`
              });
            }}
            defaultRegion={selectedRegion}
          />

          {/* Scene & Room Tabs */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 flex-1 scrollbar-hide items-center">
              {/* Scenes */}
              {scenes.map((scene) => {
                const IconMap: Record<string, any> = {
                  'home': Home,
                  'door-open': DoorOpen,
                  'tv': Tv,
                  'moon': Moon,
                  'book': Book,
                  'users': Users,
                  'coffee': Coffee,
                  'play': Activity
                };
                const Icon = IconMap[scene.icon] || Activity;

                return (
                  <button
                    key={scene.id}
                    onClick={() => toggleScene(scene.id)}
                    disabled={sceneCooldown}
                    className={`
                        relative flex items-center gap-1.5 px-3 py-2 rounded-[14px] transition-all shrink-0 border
                        ${scene.isActive
                        ? "bg-primary text-primary-foreground border-transparent shadow-md"
                        : "bg-white dark:bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"}
                      `}
                  >
                    <Icon className={`w-4 h-4 ${scene.isActive ? 'animate-pulse' : ''}`} />
                    <span className="text-[13px] font-medium whitespace-nowrap">{scene.name}</span>
                  </button>
                );
              })}

              {/* Divider */}
              <div className="w-px h-6 bg-border/50 mx-1 shrink-0" />

              {/* Common Room */}
              <button
                onClick={() => setSelectedRoom('常用')}
                className={`px-5 py-2 rounded-[14px] font-['SF_Pro_Display',sans-serif] text-[14px] transition-all whitespace-nowrap ${selectedRoom === '常用'
                  ? "shadow-[0px_0px_24px_0px_rgba(0,0,0,0.12)] text-white font-semibold"
                  : "bg-white text-[rgba(4,4,21,0.6)]"
                  }`}
                style={selectedRoom === '常用' ? { backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" } : {}}
              >
                常用
              </button>

              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.name)}
                  className={`px-5 py-2 rounded-[14px] font-['SF_Pro_Display',sans-serif] text-[14px] transition-all whitespace-nowrap ${selectedRoom === room.name
                    ? "shadow-[0px_0px_24px_0px_rgba(0,0,0,0.12)] text-white font-semibold"
                    : "bg-white text-[rgba(4,4,21,0.6)]"
                    }`}
                  style={selectedRoom === room.name ? { backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" } : {}}
                >
                  {room.name}
                </button>
              ))}
            </div>

            {selectedRoom === '常用' && (
              <button
                onClick={() => setIsEditingCommon(!isEditingCommon)}
                className={`ml-4 px-4 py-2.5 rounded-[14px] text-[14px] font-medium transition-all ${isEditingCommon
                  ? "bg-red-50 text-red-500 ring-1 ring-red-200"
                  : "bg-accent text-muted-foreground hover:bg-accent/80"
                  }`}
              >
                {isEditingCommon ? '完成' : '管理'}
              </button>
            )}
          </div>

          {/* Devices Grid - Optimized for larger cards (125% size) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 pb-24">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                nowMs={nowMs}
                onToggle={(e) => {
                  e.stopPropagation();
                  toggleDevice(device.id);
                }}
                onClick={() => handleDeviceClick(device)}
                isEditing={isEditingCommon}
                isCommon={device.isCommon}
                onToggleCommon={(e) => toggleCommon(e, device.id)}
                onPositionChange={handlePositionChange}
                onUpdate={handleLightUpdate}
                onSendIR={sendIR}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Floating Controls */}
      <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
        {/* AI Chat Button */}
        <button
          onClick={() => {
            // We need a way to open the AI Chat Widget from here.
            // Since AiChatWidget controls its own state, we can lift the state up or use a global event.
            // For simplicity in this refactor, we will modify AiChatWidget to expose a trigger or move the button here.
            // Actually, let's keep the AiChatWidget's internal state but move its button logic here.
            // Wait, AiChatWidget renders its own button. We should modify AiChatWidget to accept a custom trigger or style.
            // But the user asked to move AI icon "next to it".
            // Let's hide the button inside AiChatWidget and control it via props, OR just position them together.

            // To achieve "move AI icon next to it", we'll rely on CSS positioning in AiChatWidget 
            // and App.tsx to align them.
            // Let's first update the Settings button logic as requested.
          }}
          className="hidden" // Placeholder
        />

        {/* Settings Button (Direct Access) */}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="打开系统设置"
          className="w-12 h-12 rounded-full shadow-[0px_4px_24px_0px_rgba(0,0,0,0.2)] flex items-center justify-center transition-all hover:scale-110 z-20 relative"
          style={{ backgroundImage: "linear-gradient(163.817deg, rgb(60, 60, 65) 1.2863%, rgb(45, 45, 48) 103.1%)" }}
        >
          <Settings className="w-5 h-5 text-white" />
        </button>
      </div>

      <AiChatWidget entities={entities} callService={callService} />
      <Toaster />
    </div>
  );
}
