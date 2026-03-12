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

export const DEFAULT_REMOTE_BUTTONS: RemoteButtonConfig[] = [
  { id: 'power_on', label: '开机', icon: 'Power', color: 'text-green-500', service: 'switch.turn_on' },
  { id: 'power_off', label: '关机', icon: 'PowerOff', color: 'text-red-500', service: 'switch.turn_off' },
  { id: 'ok', label: 'OK', icon: 'Circle', service: 'remote.send_command', data: { command: 'select' } },
  { id: 'menu', label: '菜单', icon: 'Menu', service: 'remote.send_command', data: { command: 'menu' } },
  { id: 'home', label: '主页', icon: 'Home', service: 'remote.send_command', data: { command: 'home' } },
  { id: 'back', label: '返回', icon: 'ArrowLeft', service: 'remote.send_command', data: { command: 'back' } },
  { id: 'vol_up', label: '音量+', icon: 'Volume2', service: 'media_player.volume_up' },
  { id: 'vol_down', label: '音量-', icon: 'Volume1', service: 'media_player.volume_down' },
  { id: 'ch_up', label: '频道+', icon: 'ChevronUp', service: 'media_player.media_next_track' },
  { id: 'ch_down', label: '频道-', icon: 'ChevronDown', service: 'media_player.media_previous_track' },
  { id: 'up', label: '上', icon: 'ChevronUp', service: 'remote.send_command', data: { command: 'up' } },
  { id: 'down', label: '下', icon: 'ChevronDown', service: 'remote.send_command', data: { command: 'down' } },
  { id: 'left', label: '左', icon: 'ChevronLeft', service: 'remote.send_command', data: { command: 'left' } },
  { id: 'right', label: '右', icon: 'ChevronRight', service: 'remote.send_command', data: { command: 'right' } },
  { id: 'mute', label: '静音', icon: 'VolumeX', service: 'media_player.volume_mute' },
  { id: 'play', label: '播放', icon: 'Play', service: 'media_player.media_play' },
  { id: 'pause', label: '暂停', icon: 'Pause', service: 'media_player.media_pause' },
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
];
