import { useEffect, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, LayoutGrid, Plus, Search, Settings2, Speaker, Tv, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Device } from '@/types/device';
import { DEFAULT_REMOTE_BUTTONS, RemoteButtonConfig } from '@/types/remote';
import { HassEntities } from 'home-assistant-js-websocket';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import RemoteButton from './RemoteButton';
import RemoteDPad from './RemoteDPad';
import RemoteKey from './RemoteKey';

interface RemoteControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device;
  callService: (domain: string, service: string, data?: any) => Promise<void>;
  entities: HassEntities;
}

const NAV_KEYS = ['up', 'down', 'left', 'right', 'ok'] as const;
const DIGIT_KEYS = ['num_1','num_2','num_3','num_4','num_5','num_6','num_7','num_8','num_9','num_0'] as const;
const RESERVED_KEYS = new Set<string>([
  'power_on','power_off',
  ...NAV_KEYS,
  'vol_up','vol_down','mute',
  'ch_up','ch_down',
  'menu','home','back',
  ...DIGIT_KEYS
]);

const REMOTE_ICONS = [
  // Navigation
  'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
  // Media
  'Play', 'Pause', 'FastForward', 'Rewind', 'SkipBack', 'SkipForward', 'Square', // Stop
  // Actions
  'Power', 'PowerOff', 'Volume2', 'Volume1', 'VolumeX', 'Home', 'Menu', 'ArrowLeft', 'Settings', 'Search', 'Mic',
  // Generic
  'Circle', 'Triangle', 'Hexagon', 'Plus', 'Minus', 'Check', 'X',
  // Remote Specific
  'Import', 'Info', 'BookOpen', 'LogOut', 'MoreHorizontal', 'List', 'Grid', 'Tv', 'Speaker', 'Disc', 'Clapperboard', 'Youtube', 'Wrench'
];

type RemoteProfile = 'tv' | 'stb' | 'speaker';
type RemoteMappingValue = { entity_id?: string; display_text?: string; icon?: string };
type RemoteMappings = Record<string, RemoteMappingValue>;

export default function RemoteControlModal({ isOpen, onClose, device, callService, entities }: RemoteControlModalProps) {
  const { playClick } = useSoundEffect();

  const ensureButtons = (items: RemoteButtonConfig[]) => {
    const map = new Map<string, RemoteButtonConfig>();
    for (const b of DEFAULT_REMOTE_BUTTONS) map.set(b.id, b);
    for (const b of items) map.set(b.id, { ...map.get(b.id), ...b });
    return Array.from(map.values());
  };

  // State
  const [profile, setProfile] = useState<RemoteProfile>(() => {
    const saved = localStorage.getItem(`remote_profile_${device.id}`);
    if (saved === 'tv' || saved === 'stb' || saved === 'speaker') return saved;
    return 'tv';
  });

  const [buttons, setButtons] = useState<RemoteButtonConfig[]>(() => {
    const saved = localStorage.getItem(`remote_${device.id}_${profile}`); // Load from profile-specific key
    if (!saved) return ensureButtons(DEFAULT_REMOTE_BUTTONS);
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return ensureButtons(parsed as RemoteButtonConfig[]);
    } catch {
      // ignore
    }
    return ensureButtons(DEFAULT_REMOTE_BUTTONS);
  });

  const [globalMappings, setGlobalMappings] = useState<RemoteMappings>(() => {
    const saved = localStorage.getItem(`remote_global_${device.id}`);
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed as RemoteMappings;
    } catch {
      // ignore
    }
    return {};
  });

  // Persist Global Configuration
  useEffect(() => {
    localStorage.setItem(`remote_global_${device.id}`, JSON.stringify(globalMappings));
  }, [globalMappings, device.id]);

  // Trigger update event when global mappings change
  useEffect(() => {
    window.dispatchEvent(new Event('remote-config-update'));
  }, [globalMappings]);

  const [mappings, setMappings] = useState<RemoteMappings>(() => {
    const saved = localStorage.getItem(`remote_map_${device.id}_${profile}`);
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') return parsed as RemoteMappings;
    } catch {
      // ignore
    }
    return {};
  });

  const getDisplayText = (id: string, fallback?: string) => {
    const map = id.startsWith('profile_') ? globalMappings : mappings;
    const t = map?.[id]?.display_text;
    return t !== undefined && t !== null ? t : (fallback || '');
  };
  const getEntityId = (id: string, fallback?: string) => {
    const map = id.startsWith('profile_') ? globalMappings : mappings;
    const e = map?.[id]?.entity_id;
    return e && e.trim() ? e : (fallback || '');
  };
  const getIcon = (id: string, fallback?: string) => {
    const map = id.startsWith('profile_') ? globalMappings : mappings;
    const i = map?.[id]?.icon;
    return i && i.trim() ? i : (fallback || 'Circle');
  };

  const [isConfigMode, setIsConfigMode] = useState(false);
  const [activeEditId, setActiveEditId] = useState<string | null>(null);
  const [draftDisplayText, setDraftDisplayText] = useState('');
  const [draftEntityId, setDraftEntityId] = useState('');
  const [draftIcon, setDraftIcon] = useState('');
  const [draftDirty, setDraftDirty] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');

  // Persist Profile Selection
  useEffect(() => {
    localStorage.setItem(`remote_profile_${device.id}`, profile);
  }, [profile, device.id]);

  // Persist Profile-Specific Configuration
  // Note: We include buttons and mappings in dependency to save on every change
  // We use profile in key to ensure we save to the correct slot
  useEffect(() => {
    localStorage.setItem(`remote_${device.id}_${profile}`, JSON.stringify(buttons));
  }, [buttons, device.id, profile]);

  useEffect(() => {
    localStorage.setItem(`remote_map_${device.id}_${profile}`, JSON.stringify(mappings));
  }, [mappings, device.id, profile]);

  // Load config when profile changes (or device changes)
  // We use a ref to skip the initial load since useState initializer handles it
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Load Buttons
    const savedButtons = localStorage.getItem(`remote_${device.id}_${profile}`);
    if (!savedButtons) {
      setButtons(ensureButtons(DEFAULT_REMOTE_BUTTONS));
    } else {
      try {
        const parsed = JSON.parse(savedButtons);
        if (Array.isArray(parsed)) setButtons(ensureButtons(parsed as RemoteButtonConfig[]));
        else setButtons(ensureButtons(DEFAULT_REMOTE_BUTTONS));
      } catch {
        setButtons(ensureButtons(DEFAULT_REMOTE_BUTTONS));
      }
    }

    // Load Mappings
    const savedMap = localStorage.getItem(`remote_map_${device.id}_${profile}`);
    if (!savedMap) {
      setMappings({});
    } else {
      try {
        const parsed = JSON.parse(savedMap);
        if (parsed && typeof parsed === 'object') setMappings(parsed as RemoteMappings);
        else setMappings({});
      } catch {
        setMappings({});
      }
    }
  }, [profile, device.id]);

  // Notify other components (RemoteCard) when config changes
  useEffect(() => {
    window.dispatchEvent(new Event('remote-config-update'));
  }, [buttons, mappings, profile]);

  const handleProfileChange = (newProfile: RemoteProfile) => {
      // Force save current state before switching?
      // Actually, since buttons/mappings state updates trigger the save useEffect,
      // the current state is already saved. We just need to switch profile.
      setProfile(newProfile);
  };

  const getBtn = (id: string) => buttons.find(b => b.id === id);

  const topRowButtons = useMemo(() => [getBtn('power_on'), getBtn('power_off'), getBtn('menu'), getBtn('home')].filter(Boolean) as RemoteButtonConfig[], [buttons]);
  
  const centerLeftButtons = useMemo(() => [getBtn('play'), getBtn('pause'), getBtn('back')].filter(Boolean) as RemoteButtonConfig[], [buttons]);
  const centerRightButtons = useMemo(() => [getBtn('vol_up'), getBtn('mute'), getBtn('vol_down')].filter(Boolean) as RemoteButtonConfig[], [buttons]);
  
  const quickButtons = useMemo(() => buttons.filter(b => !RESERVED_KEYS.has(b.id) && !['play', 'pause'].includes(b.id)), [buttons]);

  const allowedEntityDomains = useMemo(() => new Set(['switch', 'button', 'input_button', 'script', 'scene']), []);
  const selectableEntities = useMemo(() => {
    const all = Object.values(entities || {});
    const filtered = all.filter(e => allowedEntityDomains.has(e.entity_id.split('.')[0]));
    const q = entitySearch.trim().toLowerCase();
    const list = !q ? filtered : filtered.filter(e => {
      const name = (e.attributes as any)?.friendly_name ? String((e.attributes as any).friendly_name).toLowerCase() : '';
      return e.entity_id.toLowerCase().includes(q) || name.includes(q);
    });
    return list.slice(0, 80);
  }, [entities, allowedEntityDomains, entitySearch]);

  const sanitizeDisplayText = (raw: string) => {
    const trimmed = raw.trim().slice(0, 20);
    const cleaned = trimmed.replace(/[^\p{Script=Han}A-Za-z0-9 ]/gu, '');
    return cleaned.slice(0, 20);
  };

  const canSave = useMemo(() => {
    const cleaned = sanitizeDisplayText(draftDisplayText);
    return cleaned.length >= 1 && cleaned.length <= 20;
  }, [draftDisplayText]);

  const deleteButton = (btnId: string) => {
    if (RESERVED_KEYS.has(btnId)) {
        // Core buttons cannot be deleted, UI should prevent this anyway
        return;
    }
    setButtons(prev => prev.filter(b => b.id !== btnId));
    if (activeEditId === btnId) {
        setActiveEditId(null);
        setDraftDirty(false);
    }
  };

  const openEditor = (id: string, fallbackText: string, fallbackEntityId?: string, fallbackIcon?: string) => {
    setActiveEditId(id);
    setDraftDisplayText(getDisplayText(id, fallbackText));
    setDraftEntityId(getEntityId(id, fallbackEntityId));
    setDraftIcon(getIcon(id, fallbackIcon));
    setDraftDirty(false);
    setEntitySearch('');
  };

  const saveMapping = () => {
    if (!activeEditId) return;
    const nextText = sanitizeDisplayText(draftDisplayText);
    if (!nextText || nextText.length > 20) return;

    if (activeEditId.startsWith('profile_')) {
      setGlobalMappings(prev => ({
        ...prev,
        [activeEditId]: {
          ...(prev[activeEditId] || {}),
          display_text: nextText,
          icon: draftIcon
        }
      }));
    } else {
      setMappings(prev => ({
        ...prev,
        [activeEditId]: {
          display_text: nextText,
          entity_id: draftEntityId ? draftEntityId.trim() : undefined,
          icon: draftIcon
        }
      }));
    }

    const btn = getBtn(activeEditId);
    if (btn) {
      setButtons(prev => prev.map(b => {
        if (b.id !== activeEditId) return b;
        return {
          ...b,
          label: nextText,
          entityId: draftEntityId ? draftEntityId.trim() : b.entityId,
          icon: draftIcon
        };
      }));
    }

    setDraftDirty(false);
    setActiveEditId(null);
  };

  const exitConfigMode = () => {
    if (draftDirty) {
      const ok = window.confirm('你有未保存的更改，确定要退出配置模式吗？');
      if (!ok) return;
    }
    setActiveEditId(null);
    setDraftDirty(false);
    setIsConfigMode(false);
  };

  const updateMapping = (id: string, updates: Partial<RemoteMappingValue>) => {
    if (id.startsWith('profile_')) {
      setGlobalMappings(prev => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          ...updates
        }
      }));
      return;
    }
    
    setMappings(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...updates
      }
    }));
  };

  const handlePress = async (btn: RemoteButtonConfig) => {
    if (isConfigMode) {
      openEditor(btn.id, btn.label || '按钮', btn.entityId, btn.icon);
      return;
    }

    playClick();
    if (navigator.vibrate) navigator.vibrate(15);

    try {
      if (btn.service) {
        const [domain, service] = btn.service.split('.');
        const mappedEntityId = getEntityId(btn.id, btn.entityId);
        const entityIdToCall = mappedEntityId || device.id;
        const serviceData = {
          entity_id: entityIdToCall,
          ...btn.data
        };
        await callService(domain, service, serviceData);
      }
    } catch (err) {
      console.error('Failed to call service', err);
    }
  };

  const moveButton = (dragIndex: number, hoverIndex: number) => {
    const newQuick = [...quickButtons];
    const [draggedItem] = newQuick.splice(dragIndex, 1);
    newQuick.splice(hoverIndex, 0, draggedItem);
    const reserved = buttons.filter(b => RESERVED_KEYS.has(b.id));
    setButtons([...reserved, ...newQuick]);
  };

  const addButton = () => {
    // Basic implementation for adding a button. 
    // Ideally this would open a modal to select type, but for now we add a generic one
    // and let the user configure it.
    const newBtn: RemoteButtonConfig = {
      id: `btn_${Date.now()}`,
      label: '新按钮',
      icon: 'Circle',
      service: 'homeassistant.toggle'
    };
    setButtons(prev => [...prev, newBtn]);
    // Scroll to bottom or focus new button could be added here
  };

  if (!isOpen) return null;

  const profileLabelTv = getDisplayText('profile_tv', 'TV');
  const profileLabelStb = getDisplayText('profile_stb', '机顶盒');
  const profileLabelAc = getDisplayText('profile_speaker', '音响');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
        onClick={() => {
          if (activeEditId) {
            if (draftDirty) {
              const ok = window.confirm('未保存更改，确定要关闭吗？');
              if (!ok) return;
            }
            setActiveEditId(null);
            setDraftDirty(false);
            return;
          }
          if (isConfigMode) {
            exitConfigMode();
            return;
          }
          onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-background w-full max-w-[392px] rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-[86vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0 z-10">
            <button
              onClick={() => {
                if (isConfigMode) {
                  exitConfigMode();
                  return;
                }
                setIsConfigMode(true);
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                isConfigMode ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'
              }`}
              aria-label={isConfigMode ? '退出配置模式' : '进入配置模式'}
            >
              {isConfigMode ? <Check className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
            </button>

            <span className="text-[17px] font-semibold text-foreground tracking-tight">{device.name}</span>

            <button
              onClick={() => {
                if (isConfigMode) {
                  exitConfigMode();
                  return;
                }
                onClose();
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground transition-all"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative px-6 pb-8">
            <div className="pt-2">
              <div className="bg-accent/30 rounded-[14px] p-1 flex items-center h-10">
                {([
                  { id: 'tv' as const, label: profileLabelTv, icon: Tv, mappingId: 'profile_tv' },
                  { id: 'stb' as const, label: profileLabelStb, icon: LayoutGrid, mappingId: 'profile_stb' },
                  { id: 'speaker' as const, label: profileLabelAc, icon: Speaker, mappingId: 'profile_speaker' },
                ] as const).map((p) => {
                    const currentIconName = globalMappings?.[p.mappingId]?.icon;
                    const DisplayIcon = currentIconName 
                        ? (Icons[currentIconName as keyof typeof Icons] as React.ComponentType<any>) || p.icon 
                        : p.icon;

                    return (
                      <div
                        key={p.id}
                        className={`flex-1 h-full rounded-[12px] text-[12px] font-medium transition-all flex items-center justify-center gap-1.5 relative group ${
                          profile === p.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => !isConfigMode && handleProfileChange(p.id)}
                      >
                        {isConfigMode ? (
                            <>
                                <button 
                                    className="p-1 hover:bg-accent rounded-full transition-colors relative group/icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditor(p.mappingId, p.label);
                                    }}
                                    title="点击更换图标"
                                >
                                    <DisplayIcon className="w-4 h-4" />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full ring-1 ring-background" />
                                </button>
                                <input 
                                    className="bg-transparent border-none outline-none w-16 text-center text-foreground p-0 focus:ring-0"
                                    value={getDisplayText(p.mappingId, p.label)}
                                    onChange={(e) => updateMapping(p.mappingId, { display_text: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </>
                        ) : (
                            <>
                                <DisplayIcon className="w-4 h-4" />
                                <span>{p.label}</span>
                            </>
                        )}
                      </div>
                    );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-6 px-4 w-full">
              {/* Top Row: Power On, Power Off, Menu, Home */}
              <div className="w-full grid grid-cols-4 gap-2">
                {topRowButtons.map((b) => (
                  <div key={b.id} className="flex justify-center">
                    <RemoteKey
                      button={{ ...b, label: getDisplayText(b.id, b.label), entityId: getEntityId(b.id, b.entityId), icon: getIcon(b.id, b.icon) }}
                      onClick={handlePress}
                      variant={b.id.startsWith('power') ? "power" : "soft"}
                      size="sm"
                      ariaLabel={getDisplayText(b.id, b.label)}
                      isEditing={isConfigMode}
                      isReserved={RESERVED_KEYS.has(b.id)}
                    />
                  </div>
                ))}
              </div>

              {/* Center Area: Play/Pause (Left), DPad (Center), Volume (Right) */}
              <div className="flex items-center justify-center gap-4 w-full">
                {/* Left: Play/Pause */}
                <div className="flex flex-col gap-4">
                  {centerLeftButtons.map((b) => (
                    <div key={b.id} className="w-14">
                      <RemoteKey
                        button={{ ...b, label: getDisplayText(b.id, b.label), entityId: getEntityId(b.id, b.entityId), icon: getIcon(b.id, b.icon) }}
                        onClick={handlePress}
                        size="sm"
                        variant="soft"
                        ariaLabel={getDisplayText(b.id, b.label)}
                        isEditing={isConfigMode}
                        isReserved={RESERVED_KEYS.has(b.id)}
                      />
                    </div>
                  ))}
                </div>

                {/* Center: DPad */}
                <div className="bg-accent/10 rounded-full p-4 flex items-center justify-center shrink-0">
                  <RemoteDPad buttons={buttons} onClick={handlePress} isEditing={isConfigMode} />
                </div>

                {/* Right: Volume */}
                <div className="flex flex-col gap-4">
                  {centerRightButtons.map((b) => (
                    <div key={b.id} className="w-14">
                      <RemoteKey
                        button={{ ...b, label: getDisplayText(b.id, b.label), entityId: getEntityId(b.id, b.entityId), icon: getIcon(b.id, b.icon) }}
                        onClick={handlePress}
                        size="sm"
                        variant="soft"
                        ariaLabel={getDisplayText(b.id, b.label)}
                        isEditing={isConfigMode}
                        isReserved={RESERVED_KEYS.has(b.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {(isConfigMode || quickButtons.length > 0) && (
              <div className="mt-6 space-y-3">
                {isConfigMode && (
                  <div className="flex items-center justify-between">
                    <div />
                    <button
                      onClick={addButton}
                      className="px-3 h-9 rounded-full bg-accent hover:bg-accent/80 text-muted-foreground text-[12px] font-medium flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      添加
                    </button>
                  </div>
                )}
                {quickButtons.length > 0 && (
                  <div className="overflow-x-auto -mx-2 px-2 pt-3 pb-4">
                    <div className="flex gap-4 w-max mx-auto">
                      {quickButtons.map((btn, index) => (
                        <RemoteButton
                          key={btn.id}
                          index={index}
                          button={{ ...btn, label: getDisplayText(btn.id, btn.label), entityId: getEntityId(btn.id, btn.entityId), icon: getIcon(btn.id, btn.icon) }}
                          moveButton={moveButton}
                          onClick={handlePress}
                          onEdit={(b) => openEditor(b.id, b.label || '按钮', b.entityId, b.icon)}
                          isEditing={isConfigMode}
                          onDelete={() => deleteButton(btn.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeEditId && (
            <div className="absolute inset-0 bg-background z-20 flex flex-col animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-foreground truncate">配置</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{activeEditId}</div>
                </div>
                <button
                  onClick={() => {
                    if (draftDirty) {
                      const ok = window.confirm('未保存更改，确定要关闭吗？');
                      if (!ok) return;
                    }
                    setActiveEditId(null);
                    setDraftDirty(false);
                  }}
                  className="w-9 h-9 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
                  aria-label="关闭配置"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!activeEditId.startsWith('profile_') && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">名称</label>
                  <input
                    className="w-full mt-1 p-2.5 rounded-lg bg-accent border-none text-sm"
                    value={draftDisplayText}
                    onChange={(e) => {
                      setDraftDirty(true);
                      setDraftDisplayText(e.target.value);
                    }}
                    onBlur={() => {
                      const cleaned = sanitizeDisplayText(draftDisplayText);
                      if (cleaned !== draftDisplayText) {
                        setDraftDirty(true);
                        setDraftDisplayText(cleaned);
                      }
                    }}
                    maxLength={20}
                    placeholder="1-20 字符"
                    autoFocus
                  />
                  {!canSave && (
                    <div className="mt-1 text-[11px] text-red-500">请输入 1–20 个字符（仅中文/英文/数字/空格）</div>
                  )}
                </div>
                )}

                {/* Icon Picker */}
                {(
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">图标</label>
                    <div className="mt-1 grid grid-cols-6 gap-2 bg-accent/30 p-2 rounded-xl">
                      {REMOTE_ICONS.map((iconName) => {
                        const IconComp = Icons[iconName as keyof typeof Icons] as React.ComponentType<any>;
                        if (!IconComp) return null;
                        const isSelected = draftIcon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => {
                              setDraftDirty(true);
                              setDraftIcon(iconName);
                            }}
                            className={`aspect-square flex items-center justify-center rounded-lg transition-all ${
                              isSelected ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <IconComp className="w-5 h-5" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!activeEditId.startsWith('profile_') && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">实体 ID</label>
                    <div className="mt-1 flex items-center gap-2 bg-accent rounded-lg px-3 h-10">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <input
                        className="flex-1 bg-transparent outline-none text-sm"
                        value={entitySearch}
                        onChange={(e) => setEntitySearch(e.target.value)}
                        placeholder="搜索实体"
                      />
                      <button
                        onClick={() => {
                          setDraftDirty(true);
                          setDraftEntityId('');
                          setEntitySearch('');
                        }}
                        className="text-[12px] text-muted-foreground hover:text-foreground"
                        type="button"
                      >
                        清空
                      </button>
                    </div>

                    <div className="mt-2 max-h-[260px] overflow-y-auto rounded-lg border border-border/50 bg-background">
                      {selectableEntities.map((e) => {
                        const name = (e.attributes as any)?.friendly_name ? String((e.attributes as any).friendly_name) : e.entity_id;
                        const selected = draftEntityId === e.entity_id;
                        return (
                          <button
                            type="button"
                            key={e.entity_id}
                            onClick={() => {
                              setDraftDirty(true);
                              setDraftEntityId(e.entity_id);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                              selected ? 'bg-primary/10' : 'hover:bg-accent/40'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-foreground truncate">{name}</div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate">{e.entity_id}</div>
                            </div>
                            {selected ? <Check className="w-4 h-4 text-primary" /> : null}
                          </button>
                        );
                      })}
                      {selectableEntities.length === 0 && (
                        <div className="px-3 py-10 text-center text-[12px] text-muted-foreground">未找到可用实体</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (draftDirty) {
                      const ok = window.confirm('未保存更改，确定要关闭吗？');
                      if (!ok) return;
                    }
                    setActiveEditId(null);
                    setDraftDirty(false);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium flex-1 bg-accent text-muted-foreground hover:bg-accent/80 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={saveMapping}
                  disabled={!canSave}
                  className={`px-4 py-2 rounded-xl text-sm font-medium flex-[2] transition-colors ${
                    canSave ? 'bg-primary text-primary-foreground hover:brightness-[1.03]' : 'bg-muted text-muted-foreground opacity-60 cursor-not-allowed'
                  }`}
                >
                  保存
                </button>
              </div>
              
              {!activeEditId.startsWith('profile_') && !RESERVED_KEYS.has(activeEditId) && (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => deleteButton(activeEditId)}
                    className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                  >
                    删除按钮
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
