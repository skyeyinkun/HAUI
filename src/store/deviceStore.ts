import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Device } from '@/types/device';
import { INITIAL_DEVICES } from '@/config/initialDevices';

/**
 * 设备状态管理 Store
 * 独立管理设备状态，避免其他状态变化导致不必要的重新渲染
 * 
 * 优化说明：
 * - 从 dataStore 中分离出来，专注于设备状态
 * - 组件可以只订阅需要的部分状态
 * - 减少因无关状态变化导致的重新渲染
 */
interface DeviceState {
  devices: Device[];
  setDevices: (devices: Device[] | ((prev: Device[]) => Device[])) => void;
  updateDevice: (id: number, updates: Partial<Device>) => void;
  toggleDeviceState: (id: number) => void;
}

const loadLegacy = <T>(key: string, defaultVal: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const ensureDefaultRemoteDevice = (items: Device[]): Device[] => {
  if (items.some(d => d?.type === 'remote')) return items;
  const nextId = items.reduce((maxId, d) => Math.max(maxId, typeof d?.id === 'number' ? d.id : 0), 0) + 1;
  return [
    ...items,
    {
      id: nextId,
      name: '客厅电视遥控',
      icon: 'remote',
      count: '',
      power: '',
      isOn: false,
      room: '客厅',
      type: 'remote',
      isCommon: true
    } as Device
  ];
};

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set) => ({
      devices: ensureDefaultRemoteDevice(loadLegacy('ha_devices', INITIAL_DEVICES)),
      
      setDevices: (devices) => set((state) => ({
        devices: typeof devices === 'function' ? devices(state.devices) : devices
      })),

      updateDevice: (id, updates) => set((state) => ({
        devices: state.devices.map((d) => (d.id === id ? { ...d, ...updates } : d))
      })),

      toggleDeviceState: (id) => set((state) => ({
        devices: state.devices.map((d) => {
          if (d.id === id) {
            return { ...d, isOn: !d.isOn };
          }
          return d;
        })
      }))
    }),
    {
      name: 'ha-device-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ devices: state.devices }),
    }
  )
);

// 选择器：只获取常用设备
export const selectCommonDevices = (state: DeviceState) => 
  state.devices.filter(d => d.isCommon);

// 选择器：按房间获取设备
export const selectDevicesByRoom = (room: string) => (state: DeviceState) =>
  state.devices.filter(d => d.room === room);

// 选择器：按类型获取设备
export const selectDevicesByType = (type: string) => (state: DeviceState) =>
  state.devices.filter(d => d.type === type);
