import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowLeft, GripVertical, Plus, RefreshCw, Search, Trash2, X, Check } from 'lucide-react';
import type { CardConfig } from '@/types/card-config';
import { isValidCardTitle, sanitizeCardTitle } from './cardSettings.validation';
import { CustomIcon } from './CustomIcon';
import { IconPickerPopover } from '@/app/components/dashboard/IconPickerPopover';

type HAState = {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    icon?: string;
    unit_of_measurement?: string;
    [key: string]: any;
  };
};

interface CardSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  value: CardConfig;
  defaultValue: CardConfig;
  onDraftChange: (next: CardConfig) => void;
  onResetDefault: () => void;
  onSave: (next: CardConfig) => Promise<void> | void;
  fetchStates: () => Promise<HAState[]>;
}

function SortableRow(props: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border bg-card/50 hover:bg-accent/50 transition-all duration-200 ${
        isDragging ? 'opacity-90 scale-[1.02] shadow-lg z-50 ring-1 ring-primary/20 bg-card' : ''
      }`}
    >
      <div className="flex items-center gap-2 p-2">
        <div 
          className="text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors p-1" 
          {...attributes} 
          {...listeners}
        >
          <GripVertical size={14} />
        </div>
        <div className="min-w-0 flex-1">{props.children}</div>
      </div>
    </div>
  );
}

function inferDefaultIcon(entityId: string) {
  const id = entityId.toLowerCase();
  if (id.includes('temperature') || id.includes('temp')) return 'temp';
  if (id.includes('humidity')) return 'humidity';
  if (id.includes('co2') || id.includes('carbon_dioxide')) return 'co2';
  if (id.includes('pm25') || id.includes('pm2.5')) return 'pm25';
  if (id.includes('tvoc') || id.includes('voc')) return 'voc';
  if (id.includes('noise') || id.includes('sound')) return 'noise';
  if (id.includes('illuminance') || id.includes('light')) return 'light';
  if (id.includes('pressure')) return 'pressure';
  if (id.includes('wind')) return 'wind';
  if (id.includes('heat')) return 'heat';
  if (id.includes('door') || id.includes('window') || id.includes('opening')) return 'door';
  if (id.includes('motion') || id.includes('occupancy') || id.includes('presence')) return 'motion';
  if (id.includes('smoke')) return 'smoke';
  if (id.includes('gas')) return 'gas';
  if (id.includes('water') || id.includes('leak') || id.includes('moisture')) return 'water';
  if (id.includes('button')) return 'button';
  if (id.includes('plug') || id.includes('power')) return 'plug';
  if (id.includes('battery')) return 'battery';
  if (id.includes('wifi')) return 'wifi';
  if (id.includes('alert')) return 'alert';
  return 'motion';
}

export function CardSettingsPanel({ open, onClose, value, defaultValue, onDraftChange, onResetDefault, onSave, fetchStates }: CardSettingsPanelProps) {
  const { control, handleSubmit, register, reset, watch, setValue } = useForm<CardConfig>({
    defaultValues: value,
    mode: 'onChange',
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'entities',
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [available, setAvailable] = useState<HAState[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    if (!open) return;
    reset(value);
  }, [open, reset, value]);

  useEffect(() => {
    if (!open) return;
    const sub = watch(next => {
      onDraftChange(next as CardConfig);
    });
    return () => sub.unsubscribe();
  }, [open, onDraftChange, watch]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchStates();
      setAvailable(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setAvailable([]);
      setLoadError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [fetchStates]);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const currentEntities = watch('entities') || [];
  const selectedEntityIds = useMemo(() => new Set(currentEntities.map(e => e.entity_id)), [currentEntities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter(e => {
      const name = e.attributes.friendly_name || '';
      return e.entity_id.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });
  }, [available, search]);

  const canAddMore = fields.length < 6;
  const titleValue = watch('title') || '';
  const titleOk = isValidCardTitle(titleValue);

  const submit = handleSubmit(async next => {
    await onSave(next);
    onClose();
  });

  if (!open) return null;

  // Main Settings View
  return (
    <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-xl flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-[48px] border-b border-border/10 shrink-0 bg-background/50">
        <div className="font-semibold text-[14px] tracking-tight">卡片配置</div>
        <div className="flex items-center gap-2">
           <button
            type="button"
            onClick={() => {
              onResetDefault();
              reset(defaultValue);
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
          >
            重置
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!titleOk}
            className="h-7 px-3 text-[12px] font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-sm flex items-center gap-1"
          >
            <Check size={12} />
            保存
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-colors ml-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-muted-foreground/10 hover:scrollbar-thumb-muted-foreground/20">
        <div className="space-y-5">
          {/* Title Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-medium text-muted-foreground">卡片标题</label>
              <span className={`text-[10px] ${titleOk ? 'text-muted-foreground/60' : 'text-red-500 font-medium'}`}>
                {titleValue.length}/20
              </span>
            </div>
            <input
              {...register('title', {
                required: true,
                validate: v => isValidCardTitle(v),
                onChange: e => {
                  const next = sanitizeCardTitle(String(e.target.value || ''));
                  setValue('title', next, { shouldValidate: true, shouldDirty: true });
                },
              })}
              className="w-full px-3 py-2 rounded-xl bg-muted/30 border border-transparent focus:bg-background focus:border-primary/20 focus:ring-2 focus:ring-primary/10 focus:outline-none text-[13px] transition-all placeholder:text-muted-foreground/40"
              placeholder="输入标题"
            />
          </div>

          {/* Entities List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] font-medium text-muted-foreground">显示实体 ({fields.length}/6)</label>
              {!canAddMore && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle size={10} />
                  已达上限
                </span>
              )}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!over) return;
                if (active.id === over.id) return;
                const oldIndex = fields.findIndex(f => f.id === active.id);
                const newIndex = fields.findIndex(f => f.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return;
                move(oldIndex, newIndex);
              }}
            >
              <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <SortableRow key={field.id} id={field.id}>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 py-1">
                          <div className="text-[10px] text-muted-foreground/60 truncate font-mono mb-0.5">{field.entity_id}</div>
                          <input
                            {...register(`entities.${index}.display_name` as const)}
                            placeholder="自定义名称"
                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-[13px] font-medium placeholder:text-muted-foreground/30"
                          />
                        </div>

                        <Controller
                          control={control}
                          name={`entities.${index}.icon`}
                          render={({ field: iconField }) => (
                            <IconPickerPopover
                              value={iconField.value || 'activity'}
                              onChange={iconField.onChange}
                              align="end"
                              side="left"
                            >
                              <button
                                type="button"
                                className="w-8 h-8 rounded-lg hover:bg-accent hover:text-foreground text-muted-foreground transition-colors flex items-center justify-center shrink-0 border border-transparent hover:border-border/50"
                                title="更换图标"
                              >
                                <CustomIcon name={iconField.value || 'Activity'} className="w-4 h-4" />
                              </button>
                            </IconPickerPopover>
                          )}
                        />

                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Add Entity Section */}
          <div className="space-y-2 pt-4 border-t border-border/10">
             <div className="flex items-center gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary/60 transition-colors w-3.5 h-3.5" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/30 border border-transparent focus:bg-background focus:border-primary/20 focus:ring-2 focus:ring-primary/10 focus:outline-none text-[12px] transition-all placeholder:text-muted-foreground/40"
                  placeholder="搜索添加实体..."
                />
              </div>
               <button
                type="button"
                onClick={load}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted/30 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="刷新列表"
              >
                <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
              {loading ? (
                <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground/50">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-[11px]">加载中...</span>
                </div>
              ) : loadError ? (
                <div className="py-4 text-center text-[11px] text-red-500 bg-red-500/5 rounded-lg border border-red-500/10">
                  {loadError}
                </div>
              ) : (
                filtered.map(st => {
                  if (!canAddMore) return null;
                  if (selectedEntityIds.has(st.entity_id)) return null;
                  const name = st.attributes.friendly_name || st.entity_id;
                  return (
                    <button
                      key={st.entity_id}
                      type="button"
                      onClick={() => {
                        if (!canAddMore) return;
                        append({
                          entity_id: st.entity_id,
                          ha_name: name,
                          display_name: name,
                          icon: inferDefaultIcon(st.entity_id),
                          visible: true,
                        });
                      }}
                      className="w-full group rounded-xl bg-transparent hover:bg-accent/40 border border-transparent hover:border-border/30 transition-all px-3 py-2 flex items-center justify-between text-left"
                    >
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <div className="text-[12px] font-medium text-foreground/80 group-hover:text-foreground truncate">{name}</div>
                        <div className="text-[10px] text-muted-foreground/50 font-mono truncate">{st.entity_id}</div>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                        <Plus size={12} />
                      </div>
                    </button>
                  );
                })
              )}
              {!loading && filtered.length === 0 && (
                 <div className="py-6 text-center text-[11px] text-muted-foreground/40 border border-dashed border-border/20 rounded-xl">
                   {search ? '无匹配实体' : '输入关键词搜索'}
                 </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <RefreshCw className={className} />;
}
