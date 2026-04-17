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

// 不需要发送给 AI 的域（非物理设备或无意义的辅助实体）
const IGNORED_DOMAINS = [
  'update', 'script', 'automation', 'zone', 'person',
  'scene', 'timer', 'sun', 'weather', 'persistent_notification',
  'device_tracker', 'tts', 'stt', 'number', 'select', 'button',
];

const IGNORED_PREFIXES = ['input_'];

// 上下文实体数量上限，避免 token 超限
const MAX_ENTITIES = 50;

// 高优先级域（常用设备优先）
const HIGH_PRIORITY_DOMAINS = new Set([
    'light', 'switch', 'climate', 'cover', 'fan', 'lock'
]);

// 中优先级域
const MEDIUM_PRIORITY_DOMAINS = new Set([
    'media_player', 'sensor', 'vacuum', 'humidifier', 'water_heater'
]);

export function getSmartHomeContext(entities: HassEntities): string {
  // 过滤出有效实体
  const filtered = Object.values(entities).filter(entity => {
    const domain = entity.entity_id.split('.')[0];
    if (IGNORED_DOMAINS.includes(domain)) return false;
    if (IGNORED_PREFIXES.some(prefix => domain.startsWith(prefix))) return false;
    // 排除 unavailable / unknown 状态的实体
    if (entity.state === 'unavailable' || entity.state === 'unknown') return false;
    return true;
  });

  // 按优先级排序：高优先级 > 中优先级 > 其他
  const sortedEntities = filtered.sort((a, b) => {
    const domainA = a.entity_id.split('.')[0];
    const domainB = b.entity_id.split('.')[0];
    const priorityA = HIGH_PRIORITY_DOMAINS.has(domainA) ? 3 : MEDIUM_PRIORITY_DOMAINS.has(domainA) ? 2 : 1;
    const priorityB = HIGH_PRIORITY_DOMAINS.has(domainB) ? 3 : MEDIUM_PRIORITY_DOMAINS.has(domainB) ? 2 : 1;
    return priorityB - priorityA;
  });

  // 按域名分组统计（基于排序后的列表）
  const domainCounts: Record<string, number> = {};
  for (const entity of sortedEntities) {
    const domain = entity.entity_id.split('.')[0];
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
  const simplifiedEntities = entitiesToSend.map(entity => {
    const domain = entity.entity_id.split('.')[0];
    const result: Record<string, unknown> = {
      id: entity.entity_id,
      // 中文域名标签，帮助 LLM 理解
      type: DOMAIN_LABELS[domain] || domain,
      name: entity.attributes.friendly_name || entity.entity_id.split('.')[1],
      state: entity.state,
    };
    // 传感器附带单位
    if (entity.attributes.unit_of_measurement) {
      result.unit = entity.attributes.unit_of_measurement;
    }
    // 设备子类 (如 door, window, temperature...)
    if (entity.attributes.device_class) {
      result.class = entity.attributes.device_class;
    }
    return result;
  });

  // 超限提示
  const truncateNote = filtered.length > MAX_ENTITIES
    ? `\n（仅显示前${MAX_ENTITIES}个实体，共${filtered.length}个）`
    : '';

  return `${summaryLine}${truncateNote}\n${JSON.stringify(simplifiedEntities)}`;
}

/**
 * 获取精简的设备数量摘要（仅一行文本，不包含实体列表）
 * 用于注入系统提示词，避免 token 浪费
 */
export function getDeviceSummary(entities: HassEntities): string {
  // 过滤出有效实体
  const filtered = Object.values(entities).filter(entity => {
    const domain = entity.entity_id.split('.')[0];
    if (IGNORED_DOMAINS.includes(domain)) return false;
    if (IGNORED_PREFIXES.some(prefix => domain.startsWith(prefix))) return false;
    if (entity.state === 'unavailable' || entity.state === 'unknown') return false;
    return true;
  });

  if (filtered.length === 0) return '当前无可用设备。';

  // 按域名分组统计
  const domainCounts: Record<string, number> = {};
  for (const entity of filtered) {
    const domain = entity.entity_id.split('.')[0];
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }

  // 构建摘要
  const parts = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, count]) => `${DOMAIN_LABELS[domain] || domain}(${count})`)
    .join('、');

  return `当前共${filtered.length}个设备：${parts}`;
}
