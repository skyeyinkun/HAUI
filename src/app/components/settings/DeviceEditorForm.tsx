import React, { useState, useEffect } from 'react';
import { Device } from '@/types/device';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { IconPickerPopover } from '@/app/components/dashboard/IconPickerPopover';
import { CustomIcon } from '@/app/components/dashboard/cards/shared/CustomIcon';
import { AlertCircle, ArrowLeft, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { CATEGORIES, DeviceCategoryType } from '@/utils/ha-discovery';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/app/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/components/ui/command";

interface DeviceEditorFormProps {
  device: Device;
  onSave: (device: Device) => void;
  onCancel: () => void;
  onDelete?: (device: Device) => void;
  existingNames: string[];
  rooms: string[];
  entityOptions: { entity_id: string; name: string; domain?: string; device_class?: string }[];
  usedEntityIds: string[];
}

const DEVICE_TYPE_OPTIONS = [
  { value: 'light', label: '照明', recommendedCategory: 'lighting' as DeviceCategoryType },
  { value: 'dimmer', label: '调光', recommendedCategory: 'lighting' as DeviceCategoryType },
  { value: 'switch', label: '开关', recommendedCategory: 'lighting' as DeviceCategoryType },
  { value: 'outlet', label: '插座', recommendedCategory: 'other' as DeviceCategoryType },
  { value: 'ac', label: '空调', recommendedCategory: 'hvac' as DeviceCategoryType },
  { value: 'curtain', label: '窗帘', recommendedCategory: 'curtain' as DeviceCategoryType },
  { value: 'sensor', label: '传感器', recommendedCategory: 'sensor' as DeviceCategoryType },
] as const;

function getCategoryLabel(category?: string) {
  const match = CATEGORIES.find(c => c.id === category);
  return match?.name || '';
}

function getTypeLabel(type?: string) {
  const match = DEVICE_TYPE_OPTIONS.find(t => t.value === type);
  return match?.label || '';
}

function getEntityLabel(entityOptions: { entity_id: string; name: string }[], entityId?: string) {
  const match = entityOptions.find(e => e.entity_id === entityId);
  if (!match) return entityId || '';
  return match.name || match.entity_id;
}

function inferTypeFromDomain(domain?: string, deviceClass?: string) {
  if (!domain) return undefined;
  if (domain === 'climate' || domain === 'fan' || domain === 'humidifier') return 'ac';
  if (domain === 'cover') return 'curtain';
  if (domain === 'switch' || domain === 'input_boolean') {
    return deviceClass === 'outlet' ? 'outlet' : 'switch';
  }
  if (domain === 'light') return 'light';
  if (domain === 'sensor' || domain === 'binary_sensor') return 'sensor';
  return undefined;
}

function inferIconFromDomain(domain?: string, deviceClass?: string) {
  if (!domain) return 'HelpCircle';
  if (domain === 'climate' || domain === 'fan' || domain === 'humidifier') return 'Fan';
  if (domain === 'cover') return 'Blinds';
  if (domain === 'switch' || domain === 'input_boolean') {
    return deviceClass === 'outlet' ? 'Plug' : 'ToggleLeft';
  }
  if (domain === 'light') return 'Lightbulb';
  if (domain === 'sensor' || domain === 'binary_sensor') return 'Eye';
  return 'HelpCircle';
}

function inferRecommendedCategory(device: Device): DeviceCategoryType {
  if (device.category) return device.category;
  const domain = device.entity_id?.split('.')?.[0];
  if (domain === 'light' || domain === 'switch') return 'lighting';
  if (domain === 'climate' || domain === 'fan' || domain === 'humidifier') return 'hvac';
  if (domain === 'cover') return 'curtain';
  if (domain === 'camera' || domain === 'lock' || domain === 'alarm_control_panel') return 'security';
  if (domain === 'sensor' || domain === 'binary_sensor') return 'sensor';
  return 'other';
}

export const DeviceEditorForm: React.FC<DeviceEditorFormProps> = ({
  device,
  onSave,
  onCancel,
  onDelete,
  existingNames,
  rooms,
  entityOptions,
  usedEntityIds
}) => {
  const [formData, setFormData] = useState<Partial<Device>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [openEntity, setOpenEntity] = useState(false);
  const [openRoom, setOpenRoom] = useState(false);
  const [openCategory, setOpenCategory] = useState(false);
  const [openType, setOpenType] = useState(false);
  const recommendedCategoryForDisplay = inferRecommendedCategory({
    ...device,
    category: undefined,
    entity_id: (formData.entity_id as string) || device.entity_id,
  } as Device);

  useEffect(() => {
    if (device) {
      const recommendedCategory = device.entity_id ? inferRecommendedCategory(device) : undefined;
      setFormData({ ...device, category: device.category ?? recommendedCategory });
      setErrors({});
      setTouched({});
      setShowDeleteConfirm(false);
    }
  }, [device]);

  const validateField = (field: string, value: any) => {
    let error = '';
    switch (field) {
      case 'name':
        if (!value?.trim()) error = '设备名称不能为空';
        else if (value.length > 32) error = '字符长度不能超过32';
        else if (value !== device.name && existingNames.includes(value)) error = '设备名称已存在';
        break;
      case 'room':
        if (!value) error = '请选择房间';
        break;
      case 'type':
        if (!value) error = '请选择设备类型';
        break;
      case 'entity_id':
        if (!value) error = '请选择实体 ID';
        else if (usedEntityIds.includes(value)) error = '该实体已绑定到其他设备';
        break;
      case 'category':
        if (!value) error = '请选择设备分类';
        break;
      case 'icon':
        if (!value) error = '请选择图标';
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
    return error;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof Device]);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleSave = () => {
    const nameError = validateField('name', formData.name);
    const entityError = validateField('entity_id', formData.entity_id);
    const roomError = validateField('room', formData.room);
    const typeError = validateField('type', formData.type);
    const categoryError = validateField('category', formData.category);
    const iconError = validateField('icon', formData.icon);

    if (nameError || entityError || roomError || typeError || categoryError || iconError) {
      setTouched({ name: true, entity_id: true, room: true, type: true, category: true, icon: true });
      return;
    }

    onSave({
      ...device,
      ...formData,
    } as Device);
  };

  const RoomList = (
    <Command>
      <CommandInput placeholder="搜索房间..." />
      <CommandList>
        <CommandEmpty>未找到房间</CommandEmpty>
        <CommandGroup>
          {rooms.map((room) => (
            <CommandItem
              key={`room:${room}`}
              value={room}
              onSelect={(currentValue) => {
                handleChange('room', currentValue);
                setOpenRoom(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  formData.room === room ? "opacity-100" : "opacity-0"
                )}
              />
              {room}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const CategoryList = (
    <Command>
      <CommandInput placeholder="搜索分类..." />
      <CommandList>
        <CommandEmpty>未找到分类</CommandEmpty>
        <CommandGroup>
          {CATEGORIES.map((cat) => (
            <CommandItem
              key={`cat:${cat.id}`}
              value={cat.name}
              onSelect={() => {
                handleChange('category', cat.id);
                setTouched(prev => ({ ...prev, category: true }));
                setOpenCategory(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  formData.category === cat.id ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex flex-col">
                <span>{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.description}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const TypeList = (
    <Command>
      <CommandInput placeholder="搜索类型..." />
      <CommandList>
        <CommandEmpty>未找到类型</CommandEmpty>
        <CommandGroup>
          {DEVICE_TYPE_OPTIONS.map((t) => (
            <CommandItem
              key={`type:${t.value}`}
              value={t.label}
              onSelect={() => {
                handleChange('type', t.value);
                setTouched(prev => ({ ...prev, type: true }));
                if (!touched.category && (!formData.category || formData.category === recommendedCategoryForDisplay)) {
                  handleChange('category', t.recommendedCategory);
                }
                setOpenType(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  formData.type === t.value ? "opacity-100" : "opacity-0"
                )}
              />
              {t.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const EntityList = (
    <Command>
      <CommandInput placeholder="搜索实体名称或 ID..." />
      <CommandList>
        <CommandEmpty>未找到实体</CommandEmpty>
        <CommandGroup>
          {entityOptions.map((e) => (
            <CommandItem
              key={`entity:${e.entity_id}`}
              value={`${e.name} ${e.entity_id}`}
              onSelect={() => {
                handleChange('entity_id', e.entity_id);
                setTouched(prev => ({ ...prev, entity_id: true }));
                const inferred = inferTypeFromDomain(e.domain, e.device_class);
                if (inferred && !touched.type && !formData.type) {
                  handleChange('type', inferred);
                }
                const rec = DEVICE_TYPE_OPTIONS.find(t => t.value === (inferred || formData.type));
                if (rec && !touched.category && (!formData.category || formData.category === 'other')) {
                  handleChange('category', rec.recommendedCategory);
                }
                if (!touched.name && !formData.name?.trim()) {
                  handleChange('name', e.name);
                }
                if (!touched.icon && !formData.icon) {
                  handleChange('icon', inferIconFromDomain(e.domain, e.device_class));
                }
                setOpenEntity(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  formData.entity_id === e.entity_id ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  <span className="truncate max-w-[220px]">{e.name}</span>
                  {e.domain && <Badge variant="secondary" className="text-[10px] h-4 px-1">{e.domain}</Badge>}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{e.entity_id}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={onCancel} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
              <h2 className="text-lg font-semibold tracking-tight">编辑设备</h2>
              <p className="text-sm text-muted-foreground">修改设备信息</p>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-5xl mx-auto">
          
          <div className="space-y-6 md:col-span-2 xl:col-span-2">
             
             <div className="space-y-2 relative">
                <Label className="text-sm font-medium text-muted-foreground">实体 ID <span className="text-destructive">*</span></Label>
                {isDesktop ? (
                  <Popover open={openEntity} onOpenChange={setOpenEntity}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openEntity}
                        className={cn("w-full justify-between font-mono", !formData.entity_id && "text-muted-foreground", errors.entity_id && "border-destructive")}
                        onBlur={() => handleBlur('entity_id')}
                      >
                        <span className="truncate">{formData.entity_id || "选择实体 ID..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[480px] max-w-[90vw] p-0" align="start">
                      {EntityList}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Drawer open={openEntity} onOpenChange={setOpenEntity}>
                    <DrawerTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openEntity}
                        className={cn("w-full justify-between font-mono", !formData.entity_id && "text-muted-foreground", errors.entity_id && "border-destructive")}
                        onBlur={() => handleBlur('entity_id')}
                      >
                        <span className="truncate">{formData.entity_id || "选择实体 ID..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>绑定实体 ID</DrawerTitle>
                        <DrawerDescription>从 HA 实体列表中选择要绑定的实体</DrawerDescription>
                      </DrawerHeader>
                      <div className="border-t">
                        {EntityList}
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
                {errors.entity_id && (
                   <div className="absolute right-0 -bottom-6 z-10">
                      <div className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded shadow-md flex items-center gap-1 animate-in zoom-in-95">
                         <AlertCircle className="h-3 w-3" />
                         {errors.entity_id}
                      </div>
                   </div>
                )}
             </div>

             <div className="space-y-2 relative">
                <Label htmlFor="name" className="text-foreground">设备名称 <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  value={formData.name || ''} 
                  onChange={(e) => handleChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={cn(errors.name && "border-destructive focus-visible:ring-destructive")}
                  maxLength={32}
                  placeholder="请输入设备名称"
                />
                {errors.name && (
                   <div className="absolute right-0 -bottom-6 z-10">
                      <div className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded shadow-md flex items-center gap-1 animate-in zoom-in-95">
                         <AlertCircle className="h-3 w-3" />
                         {errors.name}
                      </div>
                   </div>
                )}
             </div>

              <div className="space-y-2 relative">
                <Label>图标 <span className="text-destructive">*</span></Label>
                <div className="flex items-center gap-4 flex-wrap">
                   <div className="flex-1 min-w-[200px]">
                      <IconPickerPopover 
                          value={formData.icon || 'HelpCircle'} 
                          onChange={(icon) => {
                            handleChange('icon', icon);
                            if (touched.icon) validateField('icon', icon);
                          }} 
                       >
                          <Button variant="outline" className="h-16 w-full px-4 rounded-xl flex items-center justify-start gap-4 border-dashed hover:border-primary hover:bg-accent/50 transition-all">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                  {formData.icon?.startsWith('data:') ? (
                                    <img src={formData.icon} alt="icon" className="h-6 w-6 object-contain" />
                                  ) : (
                                    <CustomIcon name={formData.icon || 'HelpCircle'} className="h-6 w-6 text-primary" />
                                  )}
                              </div>
                              <div className="flex flex-col items-start">
                                  <span className="text-sm font-medium">更换图标</span>
                                  <span className="text-xs text-muted-foreground">支持 Lucide 图标库</span>
                              </div>
                          </Button>
                       </IconPickerPopover>
                   </div>
                </div>
                {errors.icon && (
                   <div className="absolute right-0 -bottom-6 z-10">
                      <div className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded shadow-md flex items-center gap-1 animate-in zoom-in-95">
                         <AlertCircle className="h-3 w-3" />
                         {errors.icon}
                      </div>
                   </div>
                )}
             </div>

             <div className="space-y-2 relative">
                <Label>房间 <span className="text-destructive">*</span></Label>
                {isDesktop ? (
                  <Popover open={openRoom} onOpenChange={setOpenRoom}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openRoom}
                        className={cn("w-full justify-between", !formData.room && "text-muted-foreground", errors.room && "border-destructive")}
                      >
                        {formData.room || "选择房间..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      {RoomList}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Drawer open={openRoom} onOpenChange={setOpenRoom}>
                    <DrawerTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openRoom}
                        className={cn("w-full justify-between", !formData.room && "text-muted-foreground", errors.room && "border-destructive")}
                      >
                        {formData.room || "选择房间..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>选择房间</DrawerTitle>
                        <DrawerDescription>与房间管理同步</DrawerDescription>
                      </DrawerHeader>
                      <div className="border-t">
                        {RoomList}
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
                {errors.room && (
                   <div className="absolute right-0 -bottom-6 z-10">
                      <div className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded shadow-md flex items-center gap-1 animate-in zoom-in-95">
                         <AlertCircle className="h-3 w-3" />
                         {errors.room}
                      </div>
                   </div>
                )}
             </div>

             <div className="space-y-2 relative">
                <Label>设备类型 <span className="text-destructive">*</span></Label>
                {isDesktop ? (
                  <Popover open={openType} onOpenChange={setOpenType}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openType}
                        className={cn("w-full justify-between", !formData.type && "text-muted-foreground", errors.type && "border-destructive")}
                        onBlur={() => handleBlur('type')}
                      >
                        {getTypeLabel(formData.type as string) || "选择类型..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0" align="start">
                      {TypeList}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Drawer open={openType} onOpenChange={setOpenType}>
                    <DrawerTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openType}
                        className={cn("w-full justify-between", !formData.type && "text-muted-foreground", errors.type && "border-destructive")}
                        onBlur={() => handleBlur('type')}
                      >
                        {getTypeLabel(formData.type as string) || "选择类型..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>选择设备类型</DrawerTitle>
                        <DrawerDescription>调光类/开关类/空调/窗帘类</DrawerDescription>
                      </DrawerHeader>
                      <div className="border-t">
                        {TypeList}
                      </div>
                    </DrawerContent>
                  </Drawer>
                )}
                {errors.type && (
                   <div className="absolute right-0 -bottom-6 z-10">
                      <div className="bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded shadow-md flex items-center gap-1 animate-in zoom-in-95">
                         <AlertCircle className="h-3 w-3" />
                         {errors.type}
                      </div>
                   </div>
                )}
             </div>
          </div>

        </div>
      </div>

      <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t p-4 z-20">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            {onDelete && (
                showDeleteConfirm ? (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                        <Button variant="destructive" onClick={() => onDelete(device)}>确认删除</Button>
                        <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
                    </div>
                ) : (
                    <Button 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除设备
                    </Button>
                )
            )}
            
            <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={onCancel} className="w-24">取消</Button>
                <Button onClick={handleSave} className="w-32 shadow-lg shadow-primary/20">保存更改</Button>
            </div>
          </div>
      </div>
    </div>
  );
};
