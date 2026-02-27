import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Device } from '@/types/device';
import { DeviceEditorForm } from './DeviceEditorForm';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Loader2,
  CheckSquare,
  Unplug,
  Check
} from 'lucide-react';
import { useHomeAssistant } from '@/hooks/useHomeAssistant';
import { HAConfig } from '@/types/home-assistant';
import { discoverDevicesFromStates } from '@/utils/device-discovery';
import { CATEGORIES, DeviceCategoryType } from '@/utils/ha-discovery';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';
import { HassEntities } from 'home-assistant-js-websocket';
import RoomKeywordsConfig from '@/config/room-keywords.json';
import { Checkbox } from '@/app/components/ui/checkbox';

interface DeviceDiscoveryPanelProps {
  devices: Device[];
  onUpdateDevices: (devices: Device[]) => void;
  haConfig: HAConfig;
  onUpdateConfig: (config: HAConfig) => void;
  rooms: string[];
}

// Helper for type-safe worker usage
interface WorkerMessage {
    type: 'infer';
    devices: any[];
    config: any;
}

export const DeviceDiscoveryPanel: React.FC<DeviceDiscoveryPanelProps> = ({
  devices,
  onUpdateDevices,
  haConfig,
  onUpdateConfig,
  rooms
}) => {
  const hasToken = Boolean(haConfig?.token && haConfig.token.trim().length > 20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [allDiscoveredDevices, setAllDiscoveredDevices] = useState<Device[]>([]);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  
  // Selection State
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const { fetchStatesRest, isConnected, areas, devicesRegistry, entitiesRegistry } = useHomeAssistant(haConfig);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
      // Initialize Worker
      workerRef.current = new Worker(new URL('@/workers/room-inference.worker.ts', import.meta.url), { type: 'module' });
      
      workerRef.current.onmessage = (e: MessageEvent) => {
          const { type, devices: resultDevices } = e.data;
          if (type === 'result') {
              setAllDiscoveredDevices(resultDevices);
          }
      };

      return () => {
          workerRef.current?.terminate();
      };
  }, []);

  // Initial Scan on Mount
  useEffect(() => {
    if ((isConnected || hasToken) && allDiscoveredDevices.length === 0) {
      handleScan();
    }
  }, [isConnected, hasToken]);

  const handleScan = async () => {
    if (!isConnected && !hasToken) return;
    setIsScanning(true);
    try {
      const states = await fetchStatesRest();
      const entitiesObj: HassEntities = {};
      const arr = Array.isArray(states) ? states : Object.values(states || {});
      arr.forEach((s: any) => { if (s?.entity_id) entitiesObj[s.entity_id] = s; });

      const currentMappings = haConfig.deviceMappings || {};
      const { devices: foundDevices } = discoverDevicesFromStates(
          entitiesObj, 
          [], 
          {}, 
          { areas, devicesRegistry, entitiesRegistry }
      );
      
      // Offload room inference to worker
      if (workerRef.current) {
          workerRef.current.postMessage({
              type: 'infer',
              devices: foundDevices,
              config: RoomKeywordsConfig
          });
      } else {
          // Fallback if worker fails (shouldn't happen)
          setAllDiscoveredDevices(foundDevices);
      }

    } catch (e) {
      console.error('Scan failed', e);
      toast.error('扫描失败，请检查连接');
    } finally {
      setIsScanning(false);
    }
  };

  const processedDevices = useMemo(() => {
    const currentMappings = haConfig.deviceMappings || {};
    const boundByEntityId = new Map<string, Device>();
    for (const dev of devices) {
      const entityId = dev.entity_id || currentMappings[dev.id];
      if (entityId) boundByEntityId.set(entityId, { ...dev, entity_id: entityId });
    }

    // Start with all scanned devices
    const combined = [...allDiscoveredDevices];
    
    // Add any bound devices that are NOT in the scanned list
    for (const bound of boundByEntityId.values()) {
      const alreadyFound = combined.find(d => d.entity_id === bound.entity_id);
      if (!alreadyFound) {
        combined.push({
          ...bound,
          haState: bound.haState || 'unknown',
        });
      }
    }

    const deduped: Device[] = [];
    const seenEntityIds = new Set<string>();
    for (const item of combined) {
        const entityId = item.entity_id;
        if (!entityId) continue;
        if (seenEntityIds.has(entityId)) continue;
        seenEntityIds.add(entityId);
        deduped.push(item);
    }

    return deduped.map(d => {
        // Find if this device is already in our persistent list
        const boundDevice = d.entity_id ? boundByEntityId.get(d.entity_id) : undefined;
        
        // STRICT BOUND CHECK:
        // Only consider it bound if it exists AND has a valid room assigned (not '未分配').
        // This filters out "ghost" devices that were auto-added by previous versions.
        const isBound = !!boundDevice && boundDevice.room !== '未分配';

        return {
            ...d,
            isBound,
            boundId: boundDevice?.id,
            // If bound, show the bound name/room. 
            // If not bound (or ghost), show the discovered name and inferred room.
            displayName: isBound ? boundDevice.name : d.name,
            displayRoom: isBound ? boundDevice.room : d.room,
        };
    });
  }, [allDiscoveredDevices, devices]);

  const filteredList = useMemo(() => {
    return processedDevices.filter(d => {
      if (!d.entity_id) return false;
      const matchesSearch = d.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.entity_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [processedDevices, searchQuery, selectedCategory]);

  const handleBind = (device: any) => {
    if (device.isBound) {
        const existing = devices.find(d => d.id === device.boundId);
        if (existing) setEditingDevice(existing);
    } else {
        // Adding new (no confirmation dialog)
        const maxId = Math.max(999, ...devices.map(d => d.id));
        setEditingDevice({
            ...device,
            id: maxId + 1,
            room: device.displayRoom === '未分配' ? (rooms[0] || '常用') : device.displayRoom,
            isCommon: false,
            visibility: 'visible'
        });
    }
  };

  const handleUnbind = (device: any) => {
      if (!device.boundId) return;
      const newDevices = devices.filter(d => d.id !== device.boundId);
      onUpdateDevices(newDevices);
      
      const newMappings = { ...haConfig.deviceMappings };
      delete newMappings[device.boundId];
      onUpdateConfig({ ...haConfig, deviceMappings: newMappings });
      
      toast.success('已解除绑定');
  };

  const handleSaveDevice = (updatedDevice: Device) => {
    const nextDevices = [...devices];
    const nextMappings = { ...(haConfig.deviceMappings || {}) };

    // Check if we are updating an existing ID (normal edit)
    const existingIndexById = nextDevices.findIndex(d => d.id === updatedDevice.id);
    
    // Check if we are binding an entity that already exists as a "ghost" (duplicate entity_id)
    const existingIndexByEntity = updatedDevice.entity_id 
        ? nextDevices.findIndex(d => d.entity_id === updatedDevice.entity_id)
        : -1;

    if (existingIndexById >= 0) {
        // Normal update by ID
        nextDevices[existingIndexById] = updatedDevice;
        toast.success('设备已更新');
    } else if (existingIndexByEntity >= 0) {
        // We are binding a device that already exists (likely a ghost with '未分配' room).
        // We should replace the ghost with the new valid device.
        const ghostDevice = nextDevices[existingIndexByEntity];
        
        // Remove the ghost mapping if ID changed
        if (ghostDevice.id !== updatedDevice.id) {
             delete nextMappings[ghostDevice.id];
        }
        
        // Replace in array
        nextDevices[existingIndexByEntity] = updatedDevice;
        toast.success('设备已绑定 (覆盖旧数据)');
    } else {
        // Truly new device
        nextDevices.push(updatedDevice);
        toast.success('设备已绑定');
    }

    if (updatedDevice.entity_id) nextMappings[updatedDevice.id] = updatedDevice.entity_id;
    
    onUpdateDevices(nextDevices);
    onUpdateConfig({ ...haConfig, deviceMappings: nextMappings });
    setEditingDevice(null);
  };

  const handleDeleteDevice = (device: Device) => {
      handleUnbind({ boundId: device.id, displayName: device.name });
      setEditingDevice(null);
  };

  // Selection Logic
  const toggleSelection = (entityId: string) => {
      setSelectedDeviceIds(prev => 
          prev.includes(entityId) ? prev.filter(id => id !== entityId) : [...prev, entityId]
      );
  };

  const selectAll = () => {
      if (selectedDeviceIds.length === filteredList.length) {
          setSelectedDeviceIds([]);
      } else {
          setSelectedDeviceIds(filteredList.map(d => d.entity_id!).filter(Boolean));
      }
  };

  const handleBatchBind = () => {
      const devicesToBind = processedDevices.filter(d => 
          !!d.entity_id && selectedDeviceIds.includes(d.entity_id) && !d.isBound
      );
      
      if (devicesToBind.length === 0) {
          toast.info('没有选中未绑定的设备');
          return;
      }

      let currentMaxId = Math.max(999, ...devices.map(d => d.id));
      const newDevices = [...devices];
      const newMappings = { ...(haConfig.deviceMappings || {}) };

      devicesToBind.forEach(d => {
          currentMaxId++;
          const newDevice = {
              ...d,
              id: currentMaxId,
              room: d.displayRoom === '未分配' ? (rooms[0] || '常用') : d.displayRoom,
              isCommon: false,
              visibility: 'visible'
          };
          const existingIndexByEntity = d.entity_id
              ? newDevices.findIndex(existing => existing.entity_id === d.entity_id)
              : -1;
          if (existingIndexByEntity >= 0) {
              const ghostDevice = newDevices[existingIndexByEntity];
              if (ghostDevice.id !== newDevice.id) {
                  delete newMappings[ghostDevice.id];
              }
              newDevices[existingIndexByEntity] = newDevice;
          } else {
              newDevices.push(newDevice);
          }
          if (d.entity_id) newMappings[newDevice.id] = d.entity_id;
      });

      onUpdateDevices(newDevices);
      onUpdateConfig({ ...haConfig, deviceMappings: newMappings });
      toast.success(`批量绑定成功：${devicesToBind.length} 个设备`);
      setSelectedDeviceIds([]);
      setIsSelectionMode(false);
  };

  if (editingDevice) {
    const usedEntityIds = devices
        .filter(d => d.id !== editingDevice.id) // Exclude self
        .map(d => d.entity_id)
        .filter(Boolean) as string[];

    const entityOptions = allDiscoveredDevices.map(d => ({
        entity_id: d.entity_id!,
        name: d.name,
        domain: d.entity_id!.split('.')[0],
        device_class: d.deviceClass
    }));

    return (
      <DeviceEditorForm 
        device={editingDevice}
        onSave={handleSaveDevice}
        onCancel={() => setEditingDevice(null)}
        onDelete={handleDeleteDevice}
        existingNames={devices.map(d => d.name)}
        rooms={rooms}
        entityOptions={entityOptions}
        usedEntityIds={usedEntityIds}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
        <div className="flex flex-col gap-4 p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="搜索设备名称或实体ID..." 
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    {isSelectionMode ? (
                        <>
                            <Button size="sm" variant="secondary" onClick={() => setIsSelectionMode(false)}>
                                取消
                            </Button>
                            <Button size="sm" onClick={handleBatchBind} disabled={selectedDeviceIds.length === 0}>
                                一键绑定 ({selectedDeviceIds.length})
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" variant="outline" onClick={() => setIsSelectionMode(true)}>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            批量操作
                        </Button>
                    )}
                    <Button onClick={handleScan} disabled={isScanning} size="sm" variant="outline">
                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        刷新列表
                    </Button>
                </div>
            </div>
            
            {/* Horizontal Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none mask-linear-fade">
                <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                    className="whitespace-nowrap rounded-full h-8 px-4 flex items-center justify-center gap-2"
                >
                    <span className="pb-[1px]">全部</span>
                    <Badge variant="secondary" className="bg-primary-foreground/20 text-current text-[10px] h-4 px-1 min-w-[16px] flex items-center justify-center rounded-full leading-none">
                        {processedDevices.length}
                    </Badge>
                </Button>
                {CATEGORIES.map(cat => {
                    const count = processedDevices.filter(d => d.category === cat.id).length;
                    return (
                        <Button
                            key={cat.id}
                            variant={selectedCategory === cat.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(cat.id)}
                            className="whitespace-nowrap rounded-full h-8 px-4 flex items-center justify-center gap-2"
                        >
                            <span className="pb-[1px]">{cat.name}</span>
                            {count > 0 && (
                                <Badge variant="secondary" className="bg-primary-foreground/20 text-current text-[10px] h-4 px-1 min-w-[16px] flex items-center justify-center rounded-full leading-none">
                                    {count}
                                </Badge>
                            )}
                        </Button>
                    );
                })}
            </div>
            
            {isSelectionMode && (
                <div className="flex items-center gap-2 px-1">
                    <Checkbox 
                        checked={selectedDeviceIds.length > 0 && selectedDeviceIds.length === filteredList.length}
                        onCheckedChange={selectAll}
                    />
                    <span className="text-sm text-muted-foreground">全选当前列表</span>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredList.length === 0 ? (
                    <div className="col-span-full p-8 text-center text-muted-foreground border rounded-md border-dashed">
                        没有找到相关设备
                    </div>
                ) : (
                    filteredList.map(device => (
                        <div key={device.entity_id} className={cn(
                            "group relative flex flex-col gap-3 p-4 rounded-xl border transition-all duration-200", 
                            device.isBound 
                                ? "bg-card hover:shadow-md border-primary/20" 
                                : "bg-muted/30 hover:bg-card border-dashed border-gray-300 opacity-90",
                            isSelectionMode && !!device.entity_id && selectedDeviceIds.includes(device.entity_id) && "ring-2 ring-primary bg-primary/5"
                        )}>
                            {/* Selection Overlay */}
                            {isSelectionMode && (
                                <div className="absolute top-4 left-4 z-10" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox 
                                        checked={!!device.entity_id && selectedDeviceIds.includes(device.entity_id)}
                                        onCheckedChange={() => device.entity_id && toggleSelection(device.entity_id)}
                                    />
                                </div>
                            )}

                            <div className={cn("flex items-start justify-between gap-3", isSelectionMode && "pl-8")}>
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium truncate flex items-center gap-2 text-base">
                                        {device.displayName}
                                        {device.isBound ? (
                                            <Badge variant="outline" className="text-[10px] h-5 border-primary/30 text-primary bg-primary/5">已绑定</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-[10px] h-5 bg-gray-200 text-gray-600">未绑定</Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate font-mono mt-1">{device.entity_id}</div>
                                </div>
                                <div className="shrink-0">
                                     {device.isBound ? (
                                         <div className="flex items-center gap-1">
                                             <Button size="sm" variant="outline" className="h-8" onClick={() => handleBind(device)}>
                                                 编辑
                                             </Button>
                                             <Button 
                                                 size="sm" 
                                                 variant="ghost" 
                                                 className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full" 
                                                 onClick={() => handleUnbind(device)}
                                                 title="解除绑定"
                                             >
                                                 <Unplug className="h-4 w-4" />
                                             </Button>
                                         </div>
                                     ) : (
                                         <Button size="sm" className="h-8" onClick={() => handleBind(device)}>
                                             <Plus className="h-4 w-4 mr-1" /> 绑定
                                         </Button>
                                     )}
                                </div>
                            </div>
                            
                            <div className={cn("flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t mt-auto", isSelectionMode && "pl-8")}>
                                <Badge variant="secondary" className="font-normal capitalize h-5 px-1.5">
                                    {device.type || 'Unknown'}
                                </Badge>
                                <span className="w-px h-3 bg-border mx-1"></span>
                                <span className="truncate flex-1 flex items-center gap-1">
                                    {device.displayRoom}
                                    {device.displayRoom === '未分配' && (
                                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" title="请确认房间"></span>
                                    )}
                                </span>
                                {device.haState !== undefined && (
                                    <span className="font-mono opacity-70">State: {device.haState}</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

    </div>
  );
};
