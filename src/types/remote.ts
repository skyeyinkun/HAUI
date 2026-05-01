export interface RemoteButtonConfig {
  id: string;
  label?: string;
  icon?: string; // Lucide icon name
  color?: string; // Tailwind class or Hex
  entityId?: string;
  service?: string; // e.g. "remote.send_command"
  data?: Record<string, any>; // e.g. { command: "power" }
}

export interface RemoteConfig {
  deviceId: number;
  buttons: RemoteButtonConfig[];
}

// 遥控器设备类型
export type RemoteProfile = 'tv' | 'stb' | 'speaker';

// 基础按钮定义 - 避免重复
const BASE_BUTTONS = {
  ok: { id: 'ok', label: 'OK', icon: 'Circle', service: 'remote.send_command', data: { command: 'select' } },
  menu: { id: 'menu', label: '菜单', icon: 'Menu', service: 'remote.send_command', data: { command: 'menu' } },
  home: { id: 'home', label: '主页', icon: 'Home', service: 'remote.send_command', data: { command: 'home' } },
  back: { id: 'back', label: '返回', icon: 'ArrowLeft', service: 'remote.send_command', data: { command: 'back' } },
  vol_up: { id: 'vol_up', label: '音量+', icon: 'Volume2', service: 'media_player.volume_up' },
  vol_down: { id: 'vol_down', label: '音量-', icon: 'Volume1', service: 'media_player.volume_down' },
  ch_up: { id: 'ch_up', label: '频道+', icon: 'ChevronUp', service: 'media_player.media_next_track' },
  ch_down: { id: 'ch_down', label: '频道-', icon: 'ChevronDown', service: 'media_player.media_previous_track' },
  up: { id: 'up', label: '上', icon: 'ChevronUp', service: 'remote.send_command', data: { command: 'up' } },
  down: { id: 'down', label: '下', icon: 'ChevronDown', service: 'remote.send_command', data: { command: 'down' } },
  left: { id: 'left', label: '左', icon: 'ChevronLeft', service: 'remote.send_command', data: { command: 'left' } },
  right: { id: 'right', label: '右', icon: 'ChevronRight', service: 'remote.send_command', data: { command: 'right' } },
  mute: { id: 'mute', label: '静音', icon: 'VolumeX', service: 'media_player.volume_mute' },
  play: { id: 'play', label: '播放', icon: 'Play', service: 'media_player.media_play' },
  pause: { id: 'pause', label: '暂停', icon: 'Pause', service: 'media_player.media_pause' },
} as const;

// 创建电源按钮
const createPowerButton = (profile: RemoteProfile): RemoteButtonConfig => ({
  id: 'power',
  label: '电源',
  icon: 'Power',
  service: 'remote.send_command',
  data: { command: `${profile}_power` }
});

// 各设备类型的默认按钮配置
export const PROFILE_REMOTE_BUTTONS: Record<RemoteProfile, RemoteButtonConfig[]> = {
  tv: [
    createPowerButton('tv'),
    BASE_BUTTONS.ok,
    BASE_BUTTONS.menu,
    BASE_BUTTONS.home,
    BASE_BUTTONS.back,
    BASE_BUTTONS.vol_up,
    BASE_BUTTONS.vol_down,
    BASE_BUTTONS.ch_up,
    BASE_BUTTONS.ch_down,
    BASE_BUTTONS.up,
    BASE_BUTTONS.down,
    BASE_BUTTONS.left,
    BASE_BUTTONS.right,
    BASE_BUTTONS.mute,
    BASE_BUTTONS.play,
    BASE_BUTTONS.pause,
  ],
  stb: [
    createPowerButton('stb'),
    BASE_BUTTONS.ok,
    BASE_BUTTONS.menu,
    BASE_BUTTONS.home,
    BASE_BUTTONS.back,
    BASE_BUTTONS.vol_up,
    BASE_BUTTONS.vol_down,
    BASE_BUTTONS.ch_up,
    BASE_BUTTONS.ch_down,
    BASE_BUTTONS.up,
    BASE_BUTTONS.down,
    BASE_BUTTONS.left,
    BASE_BUTTONS.right,
    BASE_BUTTONS.mute,
    { id: 'num_1', label: '1', icon: 'Square', service: 'remote.send_command', data: { command: '1' } },
    { id: 'num_2', label: '2', icon: 'Square', service: 'remote.send_command', data: { command: '2' } },
    { id: 'num_3', label: '3', icon: 'Square', service: 'remote.send_command', data: { command: '3' } },
    { id: 'num_4', label: '4', icon: 'Square', service: 'remote.send_command', data: { command: '4' } },
    { id: 'num_5', label: '5', icon: 'Square', service: 'remote.send_command', data: { command: '5' } },
    { id: 'num_6', label: '6', icon: 'Square', service: 'remote.send_command', data: { command: '6' } },
    { id: 'num_7', label: '7', icon: 'Square', service: 'remote.send_command', data: { command: '7' } },
    { id: 'num_8', label: '8', icon: 'Square', service: 'remote.send_command', data: { command: '8' } },
    { id: 'num_9', label: '9', icon: 'Square', service: 'remote.send_command', data: { command: '9' } },
    { id: 'num_0', label: '0', icon: 'Square', service: 'remote.send_command', data: { command: '0' } },
  ],
  speaker: [
    createPowerButton('speaker'),
    BASE_BUTTONS.play,
    BASE_BUTTONS.pause,
    BASE_BUTTONS.vol_up,
    BASE_BUTTONS.vol_down,
    BASE_BUTTONS.mute,
    { id: 'ch_up', label: '下一首', icon: 'SkipForward', service: 'media_player.media_next_track' },
    { id: 'ch_down', label: '上一首', icon: 'SkipBack', service: 'media_player.media_previous_track' },
  ],
};

// 向后兼容：默认使用 TV 配置
export const DEFAULT_REMOTE_BUTTONS = PROFILE_REMOTE_BUTTONS.tv;
