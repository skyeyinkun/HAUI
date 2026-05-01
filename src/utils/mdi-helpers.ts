import * as MdiIcons from '@mdi/js';
import mdiMeta from '@/assets/mdi-meta.json';
import { getEnglishKeywords } from './icon-search-mapper';

interface MdiIconMeta {
    n: string; // name
    a: string[]; // aliases
    t: string[]; // tags
}

const META = mdiMeta as MdiIconMeta[];

// HA 智能家居常用图标分类
export const HA_ICON_CATEGORIES: Record<string, string[]> = {
    '常用': [
        'lightbulb', 'lightbulb-outline', 'lightbulb-group', 'lamp',
        'power', 'power-plug', 'power-socket-eu',
        'thermometer', 'water-percent', 'weather-sunny',
        'home', 'home-outline', 'home-automation',
        'cog', 'bell', 'shield-home',
        'wifi', 'bluetooth', 'cellphone',
    ],
    '灯光': [
        'lightbulb', 'lightbulb-outline', 'lightbulb-on', 'lightbulb-on-outline',
        'lightbulb-group', 'lightbulb-group-outline',
        'lamp', 'desk-lamp', 'floor-lamp', 'floor-lamp-dual',
        'led-strip', 'led-strip-variant',
        'ceiling-light', 'ceiling-light-outline',
        'wall-sconce', 'wall-sconce-flat', 'wall-sconce-round',
        'chandelier', 'lava-lamp', 'light-switch',
        'track-light', 'outdoor-lamp', 'string-lights',
    ],
    '气候': [
        'thermometer', 'thermometer-lines',
        'air-conditioner', 'fan', 'radiator',
        'water-percent', 'weather-sunny', 'weather-cloudy',
        'weather-rainy', 'weather-snowy', 'weather-windy',
        'snowflake', 'fire', 'heat-wave',
        'air-humidifier', 'air-purifier', 'air-filter',
    ],
    '安防': [
        'shield-home', 'shield-lock', 'shield-check',
        'lock', 'lock-open', 'lock-outline',
        'door', 'door-open', 'door-closed', 'door-closed-lock',
        'gate', 'gate-open', 'gate-arrow-right',
        'window-closed', 'window-open', 'window-shutter',
        'cctv', 'motion-sensor', 'smoke-detector',
        'alarm-light', 'alarm-bell', 'alarm-panel',
    ],
    '开关': [
        'power', 'power-plug', 'power-plug-outline',
        'toggle-switch', 'toggle-switch-off',
        'light-switch', 'light-switch-off',
        'power-socket-eu', 'power-socket-us',
        'electric-switch', 'electric-switch-closed',
    ],
    '媒体': [
        'television', 'television-classic',
        'speaker', 'speaker-wireless',
        'music', 'music-note',
        'play', 'pause', 'stop', 'skip-next', 'skip-previous',
        'volume-high', 'volume-medium', 'volume-low', 'volume-off',
        'cast', 'cast-connected',
        'gamepad-variant', 'headphones',
    ],
    '传感器': [
        'thermometer', 'water-percent', 'gauge',
        'motion-sensor', 'smoke-detector',
        'leak', 'flash', 'flash-alert',
        'brightness-6', 'signal', 'sine-wave',
        'speedometer', 'counter', 'pulse',
        'eye', 'gas-cylinder', 'molecule-co2',
    ],
    '家电': [
        'washing-machine', 'tumble-dryer', 'dishwasher',
        'fridge', 'fridge-outline', 'microwave',
        'stove', 'toaster-oven', 'coffee-maker',
        'robot-vacuum', 'robot-vacuum-variant',
        'iron', 'hair-dryer', 'blender',
    ],
    '空气质量': [
        'thermometer', 'water-percent', 'molecule-co2',
        'molecule', 'gas-cylinder', 'scent', 'scent-off',
        'blur', 'grain', 'weather-fog',
        'air-purifier', 'air-filter', 'air-humidifier',
        'quality-high', 'quality-medium', 'quality-low',
        'leaf', 'wind-power', 'funnel', 'funnel-outline',
    ],
    '气象': [
        'weather-sunny', 'weather-cloudy', 'weather-rainy',
        'weather-snowy', 'weather-windy', 'weather-fog',
        'weather-lightning', 'weather-night', 'weather-partly-cloudy',
        'weather-hail', 'weather-pouring', 'weather-hurricane',
        'weather-pouring', 'weather-lightning-rainy', 'weather-sunset',
        'sun-thermometer', 'thermometer-chevron-up', 'thermometer-chevron-down',
    ],
};

export function getMdiIconPath(name: string): string | undefined {
    const cleanName = name.replace(/^mdi:/, '');
    const pascalName = cleanName
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    const key = `mdi${pascalName}`;
    return (MdiIcons as any)[key];
}

export function searchMdiIcons(query: string, limit = 80): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // 获取中文 -> 英文映射关键词
    const keywords = getEnglishKeywords(q);
    const searchTerms = keywords.length > 0 ? keywords : [q];

    // 带评分的结果
    const scored: { name: string; score: number }[] = [];

    for (const icon of META) {
        let score = 0;

        for (const term of searchTerms) {
            // 精确名称匹配 (最高分)
            if (icon.n === term) { score += 100; continue; }
            // 名称开头匹配
            if (icon.n.startsWith(term)) { score += 50; continue; }
            // 名称包含
            if (icon.n.includes(term)) { score += 20; continue; }
            // 别名匹配
            if (icon.a.some(a => a === term)) { score += 40; continue; }
            if (icon.a.some(a => a.includes(term))) { score += 15; continue; }
            // 标签匹配
            if (icon.t.some(t => t.toLowerCase().includes(term))) { score += 10; continue; }
        }

        if (score > 0) {
            scored.push({ name: icon.n, score });
        }
    }

    // 按分数排序
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.name);
}

export function getAllMdiIcons(limit = 100): string[] {
    return META.slice(0, limit).map(i => i.n);
}

export function getCategoryIcons(): string[] {
    return Object.keys(HA_ICON_CATEGORIES);
}

