import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Device } from '@/types/device';
import { Room, DEFAULT_ROOMS } from '@/types/room';
import { Scene, Log } from '@/types/dashboard';
import { User } from '@/types/user';
import { INITIAL_DEVICES } from '@/config/initialDevices';
import { logger } from '@/utils/logger';

interface DataState {
    devices: Device[];
    rooms: Room[];
    scenes: Scene[];
    users: User[];
    logs: Log[];

    // Actions
    setDevices: (devices: Device[] | ((prev: Device[]) => Device[])) => void;
    updateDevice: (id: number, updates: Partial<Device>) => void;
    deleteDevice: (id: number) => void;
    setRooms: (rooms: Room[] | ((prev: Room[]) => Room[])) => void;
    setScenes: (scenes: Scene[] | ((prev: Scene[]) => Scene[])) => void;
    setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
    setLogs: (logs: Log[] | ((prev: Log[]) => Log[])) => void; // Added setLogs for functional updates
    addLog: (log: Log) => void;
    clearLogs: () => void;

    // Specific device updates
    toggleDeviceState: (id: number) => void;
}

const ensureDefaultRemoteDevice = (items: Device[]) => {
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
            type: 'remote' as const,
            isCommon: true
        } as Device
    ];
};

const loadLegacy = <T>(key: string, defaultVal: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch {
        return defaultVal;
    }
};

export const useDataStore = create<DataState>()(
    persist(
        (set) => ({
            devices: ensureDefaultRemoteDevice(loadLegacy('ha_devices', INITIAL_DEVICES)),
            rooms: loadLegacy('ha_rooms', DEFAULT_ROOMS),
            scenes: loadLegacy('ha_scenes', []),
            users: loadLegacy('ha_users', []),
            logs: loadLegacy('ha_logs', []),

            setDevices: (devices) => set((state) => ({
                devices: typeof devices === 'function' ? devices(state.devices) : devices
            })),

            updateDevice: (id, updates) => set((state) => ({
                devices: state.devices.map((d) => (d.id === id ? { ...d, ...updates } : d))
            })),

            deleteDevice: (id) => set((state) => ({
                devices: state.devices.filter((d) => d.id !== id)
            })),

            setRooms: (rooms) => set((state) => ({
                rooms: typeof rooms === 'function' ? rooms(state.rooms) : rooms
            })),
            setScenes: (scenes) => set((state) => ({
                scenes: typeof scenes === 'function' ? scenes(state.scenes) : scenes
            })),
            setUsers: (users) => set((state) => ({
                users: typeof users === 'function' ? users(state.users) : users
            })),

            setLogs: (logs) => set((state) => ({
                logs: typeof logs === 'function' ? logs(state.logs) : logs
            })),

            addLog: (log) => set((state) => ({
                logs: [log, ...state.logs].slice(0, 50)
            })),

            clearLogs: () => set({ logs: [] }),

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
            name: 'ha-data-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => ({
                getItem: (name) => localStorage.getItem(name),
                setItem: (name, value) => {
                    localStorage.setItem(name, value);
                    // trigger sync manually instead of hijack
                    import('@/utils/sync').then(({ syncToServer }) => syncToServer());
                },
                removeItem: (name) => {
                    localStorage.removeItem(name);
                    import('@/utils/sync').then(({ syncToServer }) => syncToServer());
                }
            })),
            partialize: (state) => ({
                // Select which fields to persist
                devices: state.devices,
                rooms: state.rooms,
                scenes: state.scenes,
                users: state.users,
                logs: state.logs
            }),
            onRehydrateStorage: () => () => {
                // 存储恢复完成后，延迟触发一次服务端同步以获取最新数据
                // 使用动态导入避免循环依赖
                if (typeof window !== 'undefined') {
                    setTimeout(() => {
                        import('@/utils/sync').then(({ syncFromServer }) => {
                            logger.debug('存储已恢复，检查服务端更新...');
                            syncFromServer().then((synced: boolean) => {
                                if (synced) {
                                    logger.debug('已从服务端同步更新');
                                }
                            });
                        });
                    }, 100);
                }
            },
        }
    )
);

// 监听服务端同步完成事件，重新从 localStorage 加载数据
// 注意：不再使用 location.reload() 避免无限刷新循环
if (typeof window !== 'undefined') {
    window.addEventListener('haui-sync-complete', () => {
        logger.debug('收到同步完成事件，数据已同步到 localStorage');
        // 数据已通过 zustand persist 中间件自动恢复
        // 不需要强制刷新页面，避免打断用户体验
    });
}
