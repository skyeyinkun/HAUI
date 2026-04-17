import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useLongPress } from '@/hooks/useLongPress';
import { useUIStore } from '@/store/uiStore';
import { useDataStore } from '@/store/dataStore';
import { Home, Settings, Moon, Activity, Tv, Book, Users, Coffee, DoorOpen, Power, PowerOff } from 'lucide-react';
import { motion } from 'motion/react';
import { Toaster } from '@/app/components/ui/sonner';
import { toast } from 'sonner';

import { useWeather } from '@/hooks/useWeather';
import { encryptToken, decryptToken } from '@/utils/security';
import { logger } from '@/utils/logger';
import { handleServiceError } from '@/utils/error-handler';
import { requiresSecurityConfirm, createSecurityConfirmConfig } from '@/config/security-config';

import { DeviceCard } from '@/app/components/dashboard/DeviceCard';
import { Header } from '@/app/components/dashboard/Header';
import { StatisticsPanel } from '@/app/components/dashboard/StatisticsPanel';

import AiChatWidget from './components/AiChatWidget';
import { HAConfig } from '@/types/home-assistant';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';
import { useTime } from '@/hooks/useTime';
import { useNowMs } from '@/hooks/useNowMs';
import { emitIrTelemetry } from '@/utils/ir-telemetry';
// HassEntities 类型已在 useHASyncManager 中使用，此处导入用于其他用途
import { HashRouter as Router } from 'react-router-dom';
import { RegionSelectorModal } from '@/app/components/dashboard/RegionSelectorModal';
import { DEFAULT_REGION, Region } from '@/utils/regions';
import { getCityCoords } from '@/services/city-coords';
import { Device } from '@/types/device';
// 工具函数已迁移到 useHASyncManager

// 引入新的自定义 Hooks
import { useHASyncManager } from '@/hooks/useHASyncManager';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CardErrorBoundary } from '@/app/components/ui/CardErrorBoundary';
import { SecureActionConfirm } from '@/app/components/ui/SecureActionConfirm';
import { ScrollIndicator } from '@/app/components/ui/ScrollIndicator';
import { QuickEditMenu } from '@/app/components/dashboard/QuickEditMenu';

// 按需加载重型组件
const SettingsModal = React.lazy(() => import('./components/SettingsModal'));
const ClimateControlModal = React.lazy(() => import('./components/ClimateControlModal'));
const RemoteControlModal = React.lazy(() => import('./components/remote/RemoteControlModal'));
const LogHistoryModal = React.lazy(() => import('./components/LogHistoryModal'));
const ApiLogModal = React.lazy(() => import('./components/ApiLogModal'));

// 加载占位符组件
const ModalSkeleton = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-card rounded-lg p-8 animate-pulse">
      <div className="w-64 h-4 bg-muted rounded mb-4" />
      <div className="w-48 h-4 bg-muted rounded" />
    </div>
  </div>
);

// 连接状态提示组件 - 带防抖避免闪烁
function ConnectionStatusBanner({ isConnected, hasToken }: { isConnected: boolean; hasToken: boolean }) {
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    if (!isConnected && hasToken) {
      // 延迟 2 秒显示，避免短暂断开导致闪烁
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isConnected, hasToken]);
  
  if (!showBanner) return null;
  
  return (
    <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white px-4 py-2 text-center text-sm font-medium backdrop-blur-sm animate-in slide-in-from-top">
      <span className="flex items-center justify-center gap-2">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
        与 Home Assistant 连接已断开，部分功能不可用
      </span>
    </div>
  );
}

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

  // 安全确认对话框状态
  const [secureConfirmOpen, setSecureConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [secureConfirmConfig, setSecureConfirmConfig] = useState<{
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>({
    title: '安全验证',
    description: '此操作涉及安全敏感功能，请输入 PIN 码继续',
    severity: 'high',
  });

  // 快速编辑菜单状态
  const [quickEditDevice, setQuickEditDevice] = useState<Device | null>(null);
  const [quickEditPosition, setQuickEditPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 处理设备卡片长按 - 触发快速编辑菜单
  const handleDeviceLongPress = useCallback((device: Device, event: React.MouseEvent | React.TouchEvent) => {
    // 获取点击位置
    let x = 0;
    let y = 0;
    if ('clientX' in event) {
      x = event.clientX;
      y = event.clientY;
    } else if ('touches' in event && event.touches.length > 0) {
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
    }
    
    // 震动反馈
    window.navigator?.vibrate?.(50);
    
    setQuickEditPosition({ x, y });
    setQuickEditDevice(device);
  }, []);

  // UI State from Zustand Store
  const {
    settingsOpen, setSettingsOpen,
    settingsDefaultTab,
    climateModalOpen, setClimateModalOpen,
    logModalOpen, setLogModalOpen,
    apiLogOpen, setApiLogOpen,
    regionModalOpen, setRegionModalOpen,
    selectedClimateDevice, setSelectedClimateDevice,
    selectedRemoteDevice, setSelectedRemoteDevice,
    dashboardEditing, setDashboardEditing
  } = useUIStore();

  const isEditingCommon = dashboardEditing;
  const setIsEditingCommon = setDashboardEditing;

  // 长按触发编辑模式 - 直接使用 Hook，不在回调中调用
  const onDashboardLongPress = useLongPress(() => {
    if (!dashboardEditing) {
      window.navigator?.vibrate?.(50);
      setDashboardEditing(true);
    }
  }, undefined, { delay: 600 });

  const {
    devices, setDevices,
    rooms, setRooms,
    scenes, setScenes,
    users, setUsers,
    logs,
    addLog, clearLogs,
    updateDevice, deleteDevice
  } = useDataStore();

  // 快速编辑：重命名设备
  const handleQuickEditRename = useCallback((deviceId: number, newName: string) => {
    updateDevice(deviceId, { name: newName });
    toast.success('重命名成功', { description: `设备已重命名为「${newName}」` });
  }, [updateDevice]);

  // 快速编辑：移动设备到其他房间
  const handleQuickEditMoveRoom = useCallback((deviceId: number, newRoom: string) => {
    const device = devices.find(d => d.id === deviceId);
    const oldRoom = device?.room || '未知';
    updateDevice(deviceId, { room: newRoom });
    toast.success('移动成功', { description: `设备已从「${oldRoom}」移动到「${newRoom}」` });
  }, [devices, updateDevice]);

  // 快速编辑：删除设备
  const handleQuickEditDelete = useCallback((deviceId: number) => {
    const device = devices.find(d => d.id === deviceId);
    const deviceName = device?.name || '设备';
    deleteDevice(deviceId);
    toast.success('删除成功', { description: `「${deviceName}」已从设备列表移除` });
  }, [devices, deleteDevice]);

  // 关闭快速编辑菜单
  const handleCloseQuickEdit = useCallback(() => {
    setQuickEditDevice(null);
  }, []);

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

  // 使用 10 秒间隔的时间戳（性能优化：减少不必要的渲染）
  const nowMs = useNowMs();

  useEffect(() => {
    // Auto scroll logs to top when new log arrives
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  useEffect(() => {
    try {
      import('@/utils/sync').then(({ saveToLocalStorage }) => {
        saveToLocalStorage('selected_region', JSON.stringify(selectedRegion));
      });
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
        const decryptedToken = decryptToken(parsed.token);

        // 解密成功时自动迁移到新加密格式（持久化密钥），防止下次更新后再次失败
        if (decryptedToken && parsed.token) {
          try {
            const reEncrypted = encryptToken(decryptedToken);
            const migrated = { ...parsed, token: reEncrypted };
            localStorage.setItem('ha_config', JSON.stringify(migrated));
          } catch {
            // 迁移失败不影响正常使用
          }
        }

        // 检测 Token 是否有效（解密失败会返回空字符串）
        if (parsed.token && !decryptedToken) {
          logger.warn('Token 解密失败，可能因系统更新导致。请重新配置 HA 连接。');
          // 延迟显示提示，避免在初始化时就弹出
          setTimeout(() => {
            const event = new CustomEvent('haui-token-corrupted', {
              detail: { message: 'Token 已损坏，请重新配置 Home Assistant 连接' }
            });
            window.dispatchEvent(event);
          }, 1000);
        }
        
        return {
          ...parsed,
          token: decryptedToken
        };
      } catch (e) {
        logger.error('Failed to parse config', e);
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
    import('@/utils/sync').then(({ saveToLocalStorage }) => {
      saveToLocalStorage('ha_config', JSON.stringify(configToSave));
    });
  }, []);



  // Use Home Assistant Hook
  const { entities, callService, isConnected, connectionType, events, refreshEntities, latency, fetchStatesRest, restBaseUrl, areas, devicesRegistry, entitiesRegistry } = useHomeAssistant(haConfig);

  // 使用 HA 同步管理器 Hook - 替代原有的同步逻辑
  useHASyncManager({
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
  });

  // 使用减少动画检测
  const { reduceMotion } = useReducedMotion();

  // 安全确认逻辑已迁移到 security-config.ts，使用配置化方式管理

  /**
   * 执行需要安全确认的操作
   */
  const executeWithSecurityConfirm = useCallback((
    action: () => void,
    config: { title: string; description: string; severity: 'high' | 'medium' | 'low' }
  ) => {
    setPendingAction(() => action);
    setSecureConfirmConfig(config);
    setSecureConfirmOpen(true);
  }, []);

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
  }, [isConnected, haConfig.token, addLog]);

  // 监听 Token 损坏事件，显示重新配置提示
  useEffect(() => {
    const handleTokenCorrupted = (e: CustomEvent) => {
      const timeString = new Date().toLocaleTimeString();
      addLog({
        time: timeString,
        message: `⚠️ ${e.detail?.message || 'Token 已损坏，请重新配置'}`
      });
      toast.error('Token 解密失败', {
        description: '系统更新可能导致 Token 损坏，请在设置中重新输入',
        duration: 8000,
      });
      // 自动打开设置面板
      setSettingsOpen(true);
    };

    window.addEventListener('haui-token-corrupted', handleTokenCorrupted as EventListener);
    return () => {
      window.removeEventListener('haui-token-corrupted', handleTokenCorrupted as EventListener);
    };
  }, [addLog, setSettingsOpen]);


  // 使用防抖优化窗帘位置控制
  const debouncedPositionChange = useDebouncedCallback(
    (_id: number, val: number, entityId: string | undefined) => {
      if (entityId && entityId.startsWith('cover.')) {
        callService('cover', 'set_cover_position', {
          entity_id: entityId,
          position: val
        }).catch((err) => {
          handleServiceError(err, '窗帘开度调整', entityId);
        });
      }
    },
    300 // 300ms 防抖延迟
  );

  const handlePositionChange = useCallback((id: number, newValue: number | number[]) => {
    const val = Array.isArray(newValue) ? newValue[0] : newValue;
    const entityId = haConfig.deviceMappings[id];

    // 立即更新 UI（乐观更新）
    setDevices(prev => prev.map(device => {
      if (device.id === id && device.type === 'curtain') {
        const newPosition = val;
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

    // 防抖调用 HA 服务
    debouncedPositionChange(id, val, entityId);
  }, [haConfig.deviceMappings, debouncedPositionChange, isConnected]);

  const toggleDevice = useCallback((id: number) => {
    // 保存当前状态用于回滚
    const currentDevice = devices.find(d => d.id === id);
    if (!currentDevice) return;
    
    const previousState = currentDevice.isOn;
    const newState = !previousState;

    // 乐观更新 UI
    setDevices(prev => prev.map(device => {
      if (device.id === id) {
        // For curtains, sync position with toggle
        if (device.type === 'curtain') {
          // 窗帘打开时恢复到100%，关闭时设为0%，保持状态一致性
          const newPosition = newState ? 100 : 0;
          return { ...device, isOn: newState, position: newPosition };
        }

        if (device.type === 'light') {
          if (newState) {
            // 开灯时：如果没有亮度值或亮度为0，默认设置为255（最大亮度）
            const currentBrightness = device.brightness || 0;
            return { ...device, isOn: newState, brightness: currentBrightness > 0 ? currentBrightness : 255 };
          } else {
            // 关灯时：亮度设为0
            return { ...device, isOn: newState, brightness: 0 };
          }
        }

        return { ...device, isOn: newState };
      }
      return device;
    }));

    // HA Integration
    const entityId = haConfig.deviceMappings[id];
    if (entityId) {
      const domain = entityId.split('.')[0];
      let service = 'toggle';
      const serviceData: any = { entity_id: entityId };

      if (domain === 'cover') {
        service = newState ? 'open_cover' : 'close_cover';
      } else if (domain === 'light' || domain === 'switch') {
        service = newState ? 'turn_on' : 'turn_off';
      }

      callService(domain, service, serviceData).catch(err => {
        handleServiceError(err, '设备开关控制', entityId);
        
        // 失败回滚：恢复到之前的状态
        setDevices(prev => prev.map(device => {
          if (device.id === id) {
            return { ...device, isOn: previousState };
          }
          return device;
        }));
      });
    }

    // Generate Log Message based on device type
    let message = '';
    if (currentDevice.type === 'light') {
      message = `${currentDevice.name} ${newState ? '打开了' : '关闭了'}`;
    } else if (currentDevice.icon === 'motion' || currentDevice.name.includes('人体')) {
      message = `${currentDevice.name} ${newState ? '触发了' : '恢复正常'}`;
    } else if (currentDevice.icon === 'door' || currentDevice.name.includes('门')) {
      message = `${currentDevice.name} ${newState ? '打开了' : '关闭了'}`;
    } else if (currentDevice.type === 'curtain') {
      message = `${currentDevice.name} ${newState ? '打开了' : '关闭了'}`;
    } else {
      message = `${currentDevice.name} ${newState ? '开启' : '关闭'}`;
    }

    // Add log
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    addLog({
      time: timeString,
      message: message
    });
  }, [haConfig.deviceMappings, callService, devices]);



  const toggleCommon = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setDevices(prev => prev.map(device =>
      device.id === id ? { ...device, isCommon: !device.isCommon } : device
    ));
  }, []);

  const sendIR = useCallback((deviceId: number, code: string) => {
    const entityId = haConfig.deviceMappings[deviceId];

    if (!entityId) {
      logger.warn('[IR] No mapped entity_id for device', { deviceId, code });
      emitIrTelemetry({ deviceId, entityId: null, code, ok: false });
      return;
    }

    const okPayload = emitIrTelemetry({ deviceId, entityId, code, ok: true });
    logger.info('[IR] send', okPayload);

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    addLog({
      time: timeString,
      message: `IR ${code} → ${entityId}`
    });

    callService('remote', 'send_command', { entity_id: entityId, command: code }).catch(err => {
      logger.error('[IR] send failed', err);
      emitIrTelemetry({ deviceId, entityId, code, ok: false, error: String(err?.message || err) });
    });
  }, [haConfig.deviceMappings, callService]);

  // 使用防抖优化灯光亮度控制
  const debouncedBrightnessUpdate = useDebouncedCallback(
    (entityId: string, brightness: number) => {
      callService('light', 'turn_on', {
        entity_id: entityId,
        brightness: Math.max(0, Math.min(255, Math.round(brightness)))
      }).catch((err) => {
        handleServiceError(err, '亮度调节', entityId);
      });
    },
    200 // 200ms 防抖延迟
  );

  const handleLightUpdate = useCallback((deviceId: number, updates: Partial<Device>) => {
    // 立即更新本地状态（乐观更新）
    setDevices(prev => prev.map(device =>
      device.id === deviceId ? { ...device, ...updates } : device
    ));

    // HA Integration
    const entityId = haConfig.deviceMappings[deviceId];
    if (entityId) {
      if (updates.brightness !== undefined) {
        // 使用防抖调用亮度调节
        debouncedBrightnessUpdate(entityId, updates.brightness);
      }
      if (updates.color_temp !== undefined) {
        callService('light', 'turn_on', {
          entity_id: entityId,
          color_temp: updates.color_temp
        }).catch((err) => {
          handleServiceError(err, '色温调节', entityId);
        });
      }
      if (updates.isOn !== undefined) {
        callService('light', updates.isOn ? 'turn_on' : 'turn_off', {
          entity_id: entityId
        }).catch((err) => {
          handleServiceError(err, '灯光开关控制', entityId);
        });
      }
    }
  }, [haConfig.deviceMappings, debouncedBrightnessUpdate, callService]);

  const handleDeviceClick = useCallback((device: Device) => {
    if (device.type === 'ac' || device.type === 'climate' || device.type === 'heater' || device.type === 'fan') {
      setSelectedClimateDevice(device);
      setClimateModalOpen(true);
    } else if (device.type === 'remote') {
      setSelectedRemoteDevice(device);
    } else if (device.type === 'curtain') {
      // Do nothing for curtain click
      return;
    } else {
      // 检查是否需要安全确认（公网访问的高危操作）
      if (requiresSecurityConfirm(device, connectionType === 'Public')) {
        const action = () => toggleDevice(device.id);
        const actionName = device.isOn ? '关闭' : '开启';
        const config = createSecurityConfirmConfig(device.name, actionName);
        executeWithSecurityConfirm(action, config);
      } else {
        toggleDevice(device.id);
      }
    }
  }, [toggleDevice, connectionType, executeWithSecurityConfirm]);

  const handleClimateUpdate = useCallback((deviceId: number, updates: Partial<Device>) => {
    // HA Integration
    const entityId = haConfig.deviceMappings[deviceId];

    if (!entityId) {
      logger.warn(`[ClimateControl] No HA entity mapped for device ${deviceId}. Updates will only be local.`);
    }

    if (entityId && entityId.startsWith('climate.')) {
      logger.info(`[ClimateControl] Calling service for ${entityId}:`, updates);
    
      if (updates.temperature) {
        callService('climate', 'set_temperature', {
          entity_id: entityId,
          temperature: updates.temperature
        }).catch(err => handleServiceError(err, '温度设置', entityId));
      }
      if (updates.mode) {
        callService('climate', 'set_hvac_mode', {
          entity_id: entityId,
          hvac_mode: updates.mode
        }).catch(err => handleServiceError(err, '模式设置', entityId));
      }
      if (updates.fan_mode) {
        callService('climate', 'set_fan_mode', {
          entity_id: entityId,
          fan_mode: updates.fan_mode
        }).catch(err => handleServiceError(err, '风速设置', entityId));
      }
      if (updates.swing_mode) {
        callService('climate', 'set_swing_mode', {
          entity_id: entityId,
          swing_mode: updates.swing_mode
        }).catch(err => handleServiceError(err, '扫风设置', entityId));
      }
      if (updates.timer_minutes !== undefined) {
        logger.info(`Timer set to ${updates.timer_minutes} minutes for ${entityId}`);
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
    // 使用原生的 scene.turn_on 服务（已优化）
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
      // 调用 HA 场景服务，添加执行结果反馈
      callService('scene', 'turn_on', { entity_id: entityIdToCall as string })
        .then(() => {
          // 场景激活成功，显示成功提示
          toast.success('场景已激活', {
            description: `「${sceneName}」场景已成功执行`,
            duration: 3000,
          });
          // 记录日志
          const now = new Date();
          const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          addLog({
            time: timeString,
            message: `✓ 场景「${sceneName}」已激活`
          });
        })
        .catch((err) => {
          // 场景激活失败，显示错误详情
          handleServiceError(err, '场景激活', entityIdToCall);
          const errorMsg = err?.message || String(err);
          toast.error('场景执行失败', {
            description: `「${sceneName}」执行失败：${errorMsg}`,
            duration: 5000,
          });
          // 记录错误日志
          const now = new Date();
          const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          addLog({
            time: timeString,
            message: `✗ 场景「${sceneName}」执行失败：${errorMsg}`
          });
        });
    } else {
      logger.warn('No matching scene entity found for', scenes.find(s => s.id === id)?.name);
      toast.warning('未找到匹配的场景实体', {
        description: `场景 "${sceneName}" 未在 Home Assistant 中配置`,
      });
    }

    setSceneCooldown(true);

    // Revert after 3 seconds
    setTimeout(() => {
      setScenes(prev => prev.map(scene =>
        scene.id === id ? { ...scene, isActive: false } : scene
      ));
      setSceneCooldown(false);
    }, 3000);
  }, [sceneCooldown, scenes, haConfig.sceneMappings, entities, callService, addLog]);


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

  // 可控制的设备类型（排除传感器和遥控器）
  const controllableDeviceTypes = ['light', 'dimmer', 'switch', 'outlet', 'ac', 'climate', 'heater', 'fan', 'curtain', 'cover'];

  // 获取当前房间可控制的设备列表
  const getControllableDevices = useCallback((roomName: string) => {
    const roomDevices = roomName === '常用'
      ? devices.filter(d => d.isCommon)
      : devices.filter(d => d.room === roomName);
    return roomDevices.filter(d => 
      controllableDeviceTypes.includes(d.type) && 
      d.haAvailable !== false // 排除离线设备
    );
  }, [devices]);

  // 批量开关房间设备
  const toggleAllRoomDevices = useCallback((turnOn: boolean) => {
    const controllableDevices = getControllableDevices(selectedRoom);
    
    if (controllableDevices.length === 0) {
      toast.info('无可控设备', {
        description: '当前房间没有可控制的设备',
      });
      return;
    }

    // 批量更新本地状态（乐观更新）
    const deviceIds = controllableDevices.map(d => d.id);
    setDevices(prev => prev.map(device => {
      if (deviceIds.includes(device.id)) {
        if (device.type === 'curtain') {
          return { ...device, isOn: turnOn, position: turnOn ? 100 : 0 };
        }
        if (device.type === 'light' && turnOn) {
          const currentBrightness = device.brightness || 0;
          return { ...device, isOn: true, brightness: currentBrightness > 0 ? currentBrightness : 255 };
        }
        return { ...device, isOn: turnOn };
      }
      return device;
    }));

    // 批量调用 HA 服务
    let successCount = 0;
    let failCount = 0;

    controllableDevices.forEach(device => {
      const entityId = haConfig.deviceMappings[device.id];
      if (entityId) {
        const domain = entityId.split('.')[0];
        let service = turnOn ? 'turn_on' : 'turn_off';
        const serviceData: any = { entity_id: entityId };

        // 窗帘使用特殊服务
        if (domain === 'cover') {
          service = turnOn ? 'open_cover' : 'close_cover';
        }

        callService(domain, service, serviceData)
          .then(() => {
            successCount++;
            // 全部完成后显示结果
            if (successCount + failCount === controllableDevices.length) {
              if (failCount === 0) {
                toast.success(`已${turnOn ? '开启' : '关闭'}所有设备`, {
                  description: `成功控制 ${successCount} 个设备`,
                });
              } else {
                toast.warning(`部分设备控制失败`, {
                  description: `成功 ${successCount} 个，失败 ${failCount} 个`,
                });
              }
            }
          })
          .catch(() => {
            failCount++;
            if (successCount + failCount === controllableDevices.length) {
              toast.warning(`部分设备控制失败`, {
                description: `成功 ${successCount} 个，失败 ${failCount} 个`,
              });
            }
          });
      } else {
        // 没有映射的设备也算失败
        failCount++;
      }
    });

    // 添加日志
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    addLog({
      time: timeString,
      message: `${turnOn ? '📤' : '📥'} 批量${turnOn ? '开启' : '关闭'}「${selectedRoom}」${controllableDevices.length} 个设备`
    });
  }, [selectedRoom, getControllableDevices, haConfig.deviceMappings, callService, setDevices, addLog]);

  return (
    <div data-testid="dashboard-container" className="h-screen bg-background text-foreground relative transition-colors duration-300 flex flex-col overflow-hidden">
      {/* 全局断线状态提示 - 添加延迟显示避免闪烁 */}
      <ConnectionStatusBanner isConnected={isConnected} hasToken={Boolean(haConfig.token)} />
      {/* 使用 Suspense 包裹懒加载的 Modal 组件 */}
      <Suspense fallback={<ModalSkeleton />}>
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
          defaultTab={settingsDefaultTab}
          isConnected={isConnected}
          fetchStatesRest={fetchStatesRest}
          areas={areas}
          devicesRegistry={devicesRegistry}
          entitiesRegistry={entitiesRegistry}
        />
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        <ApiLogModal
          isOpen={apiLogOpen}
          onClose={() => setApiLogOpen(false)}
          logs={events}
        />
      </Suspense>

      {selectedClimateDevice && (
        <Suspense fallback={<ModalSkeleton />}>
          <ClimateControlModal
            isOpen={climateModalOpen}
            onClose={() => setClimateModalOpen(false)}
            device={selectedClimateDevice}
            onUpdate={handleClimateUpdate}
          />
        </Suspense>
      )}

      {selectedRemoteDevice && (
        <Suspense fallback={<ModalSkeleton />}>
          <RemoteControlModal
            isOpen={!!selectedRemoteDevice}
            onClose={() => setSelectedRemoteDevice(null)}
            device={selectedRemoteDevice}
            callService={callService}
            entities={entities}
          />
        </Suspense>
      )}

      <Suspense fallback={<ModalSkeleton />}>
        <LogHistoryModal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          logs={logs}
          onClear={clearLogs}
        />
      </Suspense>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto w-full" {...onDashboardLongPress}>
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
              void refreshEntities?.().catch(() => { });
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
            onRefreshSensors={async () => { await refreshEntities?.(); }}
            fetchStates={fetchStatesRest}
            persistence={haConfig.token ? { baseUrl: restBaseUrl || '/ha-api', token: haConfig.token } : undefined}
            setLogModalOpen={setLogModalOpen}
            clearLogs={clearLogs}
            logContainerRef={logContainerRef as React.RefObject<HTMLDivElement>}
            selectedRegion={selectedRegion}
            onRegionClick={() => setRegionModalOpen(true)}
            onToggleLight={toggleDevice}
            haConfig={haConfig}
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
          <div className="flex items-center justify-between mb-6 animate-fade-in-up">
            <ScrollIndicator className="flex-1">
              <div className="flex gap-2 pb-2 items-center">
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
                        relative flex items-center gap-1.5 px-3 py-2 rounded-[14px] transition-all duration-200 shrink-0 border
                        ${scene.isActive
                        ? "bg-primary text-primary-foreground border-transparent shadow-md"
                        : "bg-card border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"}
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
                className={`px-5 py-2 rounded-[14px] font-['SF_Pro_Display',sans-serif] text-[14px] transition-all duration-200 whitespace-nowrap ${selectedRoom === '常用'
                  ? "shadow-[var(--shadow-card-hover)] text-primary-foreground font-semibold"
                  : "bg-card text-text-secondary hover:bg-accent/60"
                  }`}
                style={selectedRoom === '常用' ? { backgroundImage: "var(--gradient-tab-active)" } : {}}
              >
                常用
              </button>

              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.name)}
                  className={`px-5 py-2 rounded-[14px] font-['SF_Pro_Display',sans-serif] text-[14px] transition-all duration-200 whitespace-nowrap ${selectedRoom === room.name
                    ? "shadow-[var(--shadow-card-hover)] text-primary-foreground font-semibold"
                    : "bg-card text-text-secondary hover:bg-accent/60"
                    }`}
                  style={selectedRoom === room.name ? { backgroundImage: "var(--gradient-tab-active)" } : {}}
                >
                  {room.name}
                </button>
              ))}
              </div>
            </ScrollIndicator>

            {selectedRoom === '常用' && (
              <div className="pb-2 shrink-0 ml-4">
                <button
                  onClick={() => setIsEditingCommon(!isEditingCommon)}
                  className={`px-4 py-2 rounded-[14px] text-[14px] font-medium transition-all ${isEditingCommon
                    ? "bg-destructive/10 text-destructive ring-1 ring-destructive/20"
                    : "bg-accent text-muted-foreground hover:bg-accent/80"
                    }`}
                >
                  {isEditingCommon ? '完成' : '管理'}
                </button>
              </div>
            )}

            {/* 批量控制按钮 - 非常用房间显示 */}
            {selectedRoom !== '常用' && getControllableDevices(selectedRoom).length > 0 && (
              <div className="pb-2 shrink-0 ml-4 flex items-center gap-2">
                <button
                  onClick={() => toggleAllRoomDevices(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-[13px] font-medium transition-all bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20"
                  title="开启当前房间所有可控设备"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>全开</span>
                </button>
                <button
                  onClick={() => toggleAllRoomDevices(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[14px] text-[13px] font-medium transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                  title="关闭当前房间所有可控设备"
                >
                  <PowerOff className="w-3.5 h-3.5" />
                  <span>全关</span>
                </button>
              </div>
            )}
          </div>

          {/* Devices Grid - Optimized for larger cards (125% size) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3 pb-24 animate-fade-in-up">
            {filteredDevices.map((device) => (
              <CardErrorBoundary key={device.id}>
                <DeviceCard
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
                  onLongPress={handleDeviceLongPress}
                />
              </CardErrorBoundary>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Floating Controls */}
      <div className="fixed bottom-8 right-8 z-50 flex items-center gap-4">
        {/* Settings Button (Direct Access) - 支持减少动画模式 */}
        {reduceMotion ? (
          // 减少动画模式：使用简单 CSS
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="打开系统设置"
            className="w-12 h-12 rounded-full flex items-center justify-center z-20 relative group cursor-pointer bg-[#0F172A]/90 text-white/90 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Settings className="w-5 h-5 text-indigo-300 group-hover:text-indigo-200 transition-colors" />
          </button>
        ) : (
          // 完整动画模式
          <motion.button
            onClick={() => setSettingsOpen(true)}
            aria-label="打开系统设置"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full flex items-center justify-center z-20 relative group cursor-pointer"
          >
            {/* 1. 外围泛光扩散层 */}
            <motion.div 
              className="absolute inset-[-4px] rounded-full opacity-40 blur-[15px] pointer-events-none"
              animate={{ 
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  scale: [1, 1.1, 1]
              }}
              transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
              style={{
                  backgroundImage: "linear-gradient(90deg, #c084fc, #60a5fa, #2dd4bf, #f472b6, #c084fc)",
                  backgroundSize: "200% 100%"
              }}
            />
            
            {/* 2. 实体流光边框 */}
            <motion.div 
              className="absolute inset-[0px] rounded-full opacity-100 pointer-events-none p-[1.5px] overflow-hidden"
            >
              <motion.div 
                  className="w-full h-full rounded-full"
                  animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
                  transition={{ duration: 4, ease: "linear", repeat: Infinity }}
                  style={{
                      backgroundImage: "linear-gradient(90deg, #c084fc, #60a5fa, #2dd4bf, #f472b6, #c084fc)",
                      backgroundSize: "200% 100%"
                  }}
              />
            </motion.div>
            
            {/* 3. 多重水波纹效果 */}
            {[0, 1].map((index) => (
              <motion.div 
                key={index}
                className="absolute inset-0 rounded-full border border-indigo-400/30 pointer-events-none"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeOut",
                    delay: index * 1.5
                }}
              />
            ))}

            {/* 4. 按钮主体 */}
            <div className="relative z-10 w-[calc(100%-3px)] h-[calc(100%-3px)] rounded-full flex items-center justify-center transition-all duration-500 !bg-[#0F172A]/90 backdrop-blur-2xl text-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
              <Settings className="w-5 h-5 text-indigo-300 drop-shadow-[0_0_8px_rgba(165,180,252,0.8)] group-hover:scale-110 transition-transform duration-300" />
              
              {/* 内部微光扫过 */}
              <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"
                  animate={{ translateX: ["100%", "-100%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
              />
            </div>
          </motion.button>
        )}
      </div>

      <AiChatWidget entities={entities} />
      <Toaster />

      {/* 版本号显示 - 底部居中，提高 z-index 确保显示 */}
      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
        <span className="text-[10px] text-muted-foreground/50 font-medium tracking-wide select-none">
          HAUI v{import.meta.env.VITE_APP_VERSION || '4.3.2'}
        </span>
      </div>

      {/* 安全确认对话框 - 用于公网访问的高危操作二次确认 */}
      <SecureActionConfirm
        isOpen={secureConfirmOpen}
        onClose={() => {
          setSecureConfirmOpen(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          if (pendingAction) {
            pendingAction();
          }
          setPendingAction(null);
        }}
        title={secureConfirmConfig.title}
        description={secureConfirmConfig.description}
        severity={secureConfirmConfig.severity}
      />

      {/* 设备快速编辑菜单 - 长按设备卡片触发 */}
      {quickEditDevice && (
        <QuickEditMenu
          device={quickEditDevice}
          rooms={rooms}
          position={quickEditPosition}
          onClose={handleCloseQuickEdit}
          onRename={handleQuickEditRename}
          onMoveRoom={handleQuickEditMoveRoom}
          onDelete={handleQuickEditDelete}
        />
      )}
    </div>
  );
}
