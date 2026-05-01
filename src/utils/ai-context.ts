import { HassEntities } from 'home-assistant-js-websocket';

// 域名中文翻译映射，帮助 LLM 更好理解设备类型
const DOMAIN_LABELS: Record<string, string> = {
  light: '灯光',
  switch: '开关',
  cover: '窗帘',
  climate: '空调/温控',
  fan: '风扇',
  media_player: '媒体播放器',
  lock: '门锁',
  sensor: '传感器',
  binary_sensor: '二元传感器',
  vacuum: '扫地机器人',
  humidifier: '加湿器',
  water_heater: '热水器',
  remote: '遥控器',
};

const ACTIVE_STATE_LABELS = new Set(['on', 'open', 'opening', 'playing', 'heat', 'cool', 'dry', 'fan_only', 'auto', 'home']);

// 不需要发送给 AI 的域（非物理设备或无意义的辅助实体）
const IGNORED_DOMAINS = [
  'update', 'zone', 'person',
  'timer', 'sun', 'weather', 'persistent_notification',
  'device_tracker', 'tts', 'stt',
];

const IGNORED_PREFIXES = ['input_text', 'input_datetime'];

// 上下文实体数量上限，避免 token 超限
const MAX_ENTITIES = 80;

// 高优先级域（常用设备优先）
const HIGH_PRIORITY_DOMAINS = new Set([
    'light', 'switch', 'climate', 'cover', 'fan', 'lock'
]);

// 中优先级域
const MEDIUM_PRIORITY_DOMAINS = new Set([
    'media_player', 'sensor', 'binary_sensor', 'vacuum', 'humidifier', 'water_heater', 'remote', 'scene', 'script'
]);

type EntityLike = HassEntities[string];

function getDomain(entityId: string): string {
  return entityId.split('.')[0] || '';
}

function getEntityName(entity: EntityLike): string {
  return String(entity.attributes?.friendly_name || entity.entity_id.split('.')[1] || entity.entity_id);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isIgnoredEntity(entity: EntityLike): boolean {
  const domain = getDomain(entity.entity_id);
  if (IGNORED_DOMAINS.includes(domain)) return true;
  if (IGNORED_PREFIXES.some(prefix => domain.startsWith(prefix))) return true;
  return false;
}

function isUnavailableState(state: string): boolean {
  return state === 'unavailable' || state === 'unknown';
}

function priorityForDomain(domain: string): number {
  if (HIGH_PRIORITY_DOMAINS.has(domain)) return 3;
  if (MEDIUM_PRIORITY_DOMAINS.has(domain)) return 2;
  return 1;
}

function getSortedEntities(entities: HassEntities, includeUnavailable = false): EntityLike[] {
  // 过滤出有效实体
  const filtered = Object.values(entities).filter(entity => !isIgnoredEntity(entity) && (includeUnavailable || !isUnavailableState(entity.state)));

  // 按优先级排序：高优先级 > 中优先级 > 其他
  return filtered.sort((a, b) => {
    const domainA = getDomain(a.entity_id);
    const domainB = getDomain(b.entity_id);
    const priorityDiff = priorityForDomain(domainB) - priorityForDomain(domainA);
    if (priorityDiff !== 0) return priorityDiff;
    return getEntityName(a).localeCompare(getEntityName(b), 'zh-Hans-CN');
  });
}

function toEntityDigest(entity: EntityLike, includeEntityId = false): Record<string, unknown> {
  const domain = getDomain(entity.entity_id);
  const result: Record<string, unknown> = {
    type: DOMAIN_LABELS[domain] || domain,
    name: getEntityName(entity),
    state: entity.state,
  };

  if (includeEntityId) result.entity_id = entity.entity_id;
  if (entity.attributes.unit_of_measurement) result.unit = entity.attributes.unit_of_measurement;
  if (entity.attributes.device_class) result.class = entity.attributes.device_class;
  if (entity.attributes.current_temperature !== undefined) result.current_temperature = entity.attributes.current_temperature;
  if (entity.attributes.temperature !== undefined) result.target_temperature = entity.attributes.temperature;
  if (entity.attributes.brightness !== undefined) result.brightness = entity.attributes.brightness;
  if (entity.attributes.current_position !== undefined) result.position = entity.attributes.current_position;
  if (entity.attributes.battery_level !== undefined) result.battery = entity.attributes.battery_level;
  if (entity.last_changed) result.last_changed = entity.last_changed;
  return result;
}

function toEntityDetails(entity: EntityLike): Record<string, unknown> {
  const domain = getDomain(entity.entity_id);
  const allowedAttributeKeys = [
    'friendly_name', 'device_class', 'unit_of_measurement', 'current_temperature',
    'temperature', 'target_temp_step', 'min_temp', 'max_temp', 'hvac_modes',
    'fan_modes', 'swing_modes', 'fan_mode', 'swing_mode', 'brightness',
    'color_temp', 'rgb_color', 'current_position', 'supported_features',
    'battery_level', 'volume_level', 'media_title'
  ];

  const attributes: Record<string, unknown> = {};
  for (const key of allowedAttributeKeys) {
    if (entity.attributes[key] !== undefined) {
      attributes[key] = entity.attributes[key];
    }
  }

  return {
    type: DOMAIN_LABELS[domain] || domain,
    domain,
    name: getEntityName(entity),
    state: entity.state,
    attributes,
    last_changed: entity.last_changed,
    last_updated: entity.last_updated,
  };
}

export function getSmartHomeContext(entities: HassEntities): string {
  const sortedEntities = getSortedEntities(entities);

  // 按域名分组统计（基于排序后的列表）
  const domainCounts: Record<string, number> = {};
  for (const entity of sortedEntities) {
    const domain = getDomain(entity.entity_id);
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }

  // 构建汇总头部
  const summaryParts = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => {
      const label = DOMAIN_LABELS[domain] || domain;
      return `${label}(${count}个)`;
    });
  const summaryLine = `设备概览：共${sortedEntities.length}个实体 — ${summaryParts.join('、')}`;

  // 精简实体列表（超限时截取，优先保留高优先级设备）
  const entitiesToSend = sortedEntities.length > MAX_ENTITIES
    ? sortedEntities.slice(0, MAX_ENTITIES)
    : sortedEntities;

  // 构建精简实体数据
  const simplifiedEntities = entitiesToSend.map(entity => toEntityDigest(entity));

  // 超限提示
  const truncateNote = sortedEntities.length > MAX_ENTITIES
    ? `\n（仅显示前${MAX_ENTITIES}个实体，共${sortedEntities.length}个；可用 find_entities 工具继续查找）`
    : '';

  return `${summaryLine}${truncateNote}\n${JSON.stringify(simplifiedEntities)}`;
}

/**
 * 获取精简的设备数量摘要（仅一行文本，不包含实体列表）
 * 用于注入系统提示词，避免 token 浪费
 */
export function getDeviceSummary(entities: HassEntities): string {
  // 过滤出有效实体
  const filtered = getSortedEntities(entities);

  if (filtered.length === 0) return '当前无可用设备。';

  // 按域名分组统计
  const domainCounts: Record<string, number> = {};
  for (const entity of filtered) {
    const domain = getDomain(entity.entity_id);
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }

  // 构建摘要
  const parts = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => `${DOMAIN_LABELS[domain] || domain}(${count})`)
    .join('、');

  return `当前共${filtered.length}个设备：${parts}`;
}

export function getHomeAssistantSummary(entities: HassEntities): Record<string, unknown> {
  const all = Object.values(entities).filter(entity => !isIgnoredEntity(entity));
  const available = all.filter(entity => !isUnavailableState(entity.state));
  const unavailable = all.length - available.length;
  const byDomain: Record<string, number> = {};
  const activeByDomain: Record<string, number> = {};
  const activeEntities: Record<string, unknown>[] = [];
  const sensorReadings: Record<string, unknown>[] = [];
  const unavailableEntities: Record<string, unknown>[] = [];
  const lowBatteryEntities: Record<string, unknown>[] = [];

  for (const entity of available) {
    const domain = getDomain(entity.entity_id);
    byDomain[domain] = (byDomain[domain] || 0) + 1;

    if (ACTIVE_STATE_LABELS.has(entity.state)) {
      activeByDomain[domain] = (activeByDomain[domain] || 0) + 1;
      if (activeEntities.length < 30) activeEntities.push(toEntityDigest(entity));
    }

    if ((domain === 'sensor' || domain === 'binary_sensor') && sensorReadings.length < 40) {
      sensorReadings.push(toEntityDigest(entity));
    }

    const batteryLevel = entity.attributes.battery_level;
    if (typeof batteryLevel === 'number' && batteryLevel <= 20 && lowBatteryEntities.length < 20) {
      lowBatteryEntities.push(toEntityDigest(entity));
    }
  }

  for (const entity of all) {
    if (isUnavailableState(entity.state) && unavailableEntities.length < 30) {
      unavailableEntities.push(toEntityDigest(entity));
    }
  }

  return {
    total: all.length,
    available: available.length,
    unavailable,
    by_domain: byDomain,
    active_by_domain: activeByDomain,
    active_entities: activeEntities,
    recent_sensor_readings: sensorReadings,
    unavailable_entities: unavailableEntities,
    low_battery_entities: lowBatteryEntities,
  };
}

export interface EntitySearchOptions {
  query?: string;
  domain?: string;
  limit?: number;
  includeUnavailable?: boolean;
}

export function findEntitiesForAi(entities: HassEntities, options: EntitySearchOptions = {}): Record<string, unknown>[] {
  const query = (options.query || '').trim().toLowerCase();
  const domain = (options.domain || '').trim();
  const limit = Math.min(Math.max(options.limit || 20, 1), 50);

  return getSortedEntities(entities, Boolean(options.includeUnavailable))
    .filter(entity => {
      const entityDomain = getDomain(entity.entity_id);
      if (domain && entityDomain !== domain) return false;
      if (!query) return true;
      const haystack = `${entity.entity_id} ${getEntityName(entity)} ${entity.state} ${entity.attributes.device_class || ''}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, limit)
    .map(entity => toEntityDigest(entity, true));
}

export function getEntityStateForAi(entities: HassEntities, entityId: string): Record<string, unknown> | null {
  const entity = entities[entityId];
  return entity ? toEntityDetails(entity) : null;
}

export function getAiEntityDisplayName(entities: HassEntities, entityId: string): string {
  const entity = entities[entityId];
  if (!entity) return entityId;
  return getEntityName(entity);
}

export function sanitizeAiResponseForDisplay(text: string, entities: HassEntities): string {
  if (!text) return text;

  let sanitized = text
    .replace(/(?:^|[，,；;\s])(?:图标|icon)\s*[:：]\s*mdi:[a-z0-9-]+/gi, '')
    .replace(/(?:^|[，,；;\s])(?:图标|icon)\s*[:：]\s*(?=\n|$)/gi, '')
    .replace(/mdi:[a-z0-9-]+/gi, '')
    .replace(/(^|\n)\s*(图标|icon)\s*[:：]\s*.*(?=\n|$)/gi, '$1');

  const replacements = Object.values(entities)
    .filter(entity => entity?.entity_id)
    .map(entity => {
      const name = getEntityName(entity);
      return {
        entityId: entity.entity_id,
        slug: entity.entity_id.split('.')[1] || '',
        name,
      };
    })
    .filter(item => item.name && item.name !== item.entityId)
    .sort((a, b) => b.entityId.length - a.entityId.length);

  for (const item of replacements) {
    sanitized = sanitized.replace(new RegExp(escapeRegExp(item.entityId), 'g'), item.name);
    if (item.slug) {
      sanitized = sanitized.replace(
        new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(item.slug)}(?=$|[^A-Za-z0-9_])`, 'g'),
        `$1${item.name}`
      );
    }
  }

  return sanitized.replace(/[ \t]+\n/g, '\n').trim();
}
