/**
 * HA 实体数据清洗工具
 * 从 friendly_name / entity_id 中提取房间名、设备类型、设备名等信息
 */

// ================================================================
// 1. 房间关键词映射（中文名 → 房间名）
// ================================================================
const ROOM_KEYWORDS: [string, string][] = [
    // 具体房间名（长的优先，避免 "卧室" 匹配到 "卧"）
    ['主卧室', '主卧'],
    ['主卧', '主卧'],
    ['次卧室', '次卧'],
    ['次卧', '次卧'],
    ['儿童房', '儿童房'],
    ['老人房', '老人房'],
    ['客房', '客房'],
    ['客厅', '客厅'],
    ['餐厅', '餐厅'],
    ['厨房', '厨房'],
    ['卫生间', '卫生间'],
    ['洗手间', '卫生间'],
    ['厕所', '卫生间'],
    ['浴室', '浴室'],
    ['书房', '书房'],
    ['阳台', '阳台'],
    ['露台', '阳台'],
    ['玄关', '玄关'],
    ['走廊', '走廊'],
    ['过道', '走廊'],
    ['楼梯', '楼梯'],
    ['车库', '车库'],
    ['花园', '花园'],
    ['庭院', '庭院'],
    ['衣帽间', '衣帽间'],
    ['储物间', '储物间'],
    ['地下室', '地下室'],
    ['阁楼', '阁楼'],
    ['门厅', '门厅'],
    ['会议室', '会议室'],
    ['办公室', '办公室'],
    ['健身房', '健身房'],
    ['影音室', '影音室'],
    ['茶室', '茶室'],
    ['洗衣房', '洗衣房'],
    // 英文 entity_id 中的常见房间
    ['living_room', '客厅'],
    ['bedroom', '卧室'],
    ['master_bedroom', '主卧'],
    ['kitchen', '厨房'],
    ['bathroom', '浴室'],
    ['study', '书房'],
    ['balcony', '阳台'],
    ['hallway', '走廊'],
    ['garage', '车库'],
    ['garden', '花园'],
];

// ================================================================
// 2. 设备类型关键词映射（中文名 → 设备类型标签）
// ================================================================
export interface DeviceTypeInfo {
    type: string;      // 内部类型 key
    label: string;     // 中文标签
    icon: string;      // MDI 图标名
    category: string;  // 分类
}

const DEVICE_TYPE_KEYWORDS: [string[], DeviceTypeInfo][] = [
    // 灯光
    [['灯', '灯光', '台灯', '壁灯', '吊灯', '射灯', '灯带', '夜灯', '筒灯', '落地灯', '吸顶灯'],
    { type: 'light', label: '灯', icon: 'lightbulb', category: 'lighting' }],

    // 开关
    [['开关', '墙壁开关', '单开', '双开', '三开', '智能开关'],
    { type: 'switch', label: '开关', icon: 'toggle-switch', category: 'switch' }],

    // 插座
    [['插座', '排插', '智能插座'],
    { type: 'outlet', label: '插座', icon: 'power-socket-eu', category: 'switch' }],

    // 窗帘
    [['窗帘', '纱帘', '卷帘', '百叶窗', '遮阳帘', '布帘'],
    { type: 'curtain', label: '窗帘', icon: 'curtains', category: 'curtain' }],

    // 空调
    [['空调', '中央空调', '立式空调', '挂式空调', '柜式空调'],
    { type: 'ac', label: '空调', icon: 'air-conditioner', category: 'hvac' }],

    // 暖气
    [['暖气', '地暖', '暖风机', '电暖', '壁挂炉', '散热器'],
    { type: 'heater', label: '暖气', icon: 'radiator', category: 'hvac' }],

    // 风扇
    [['风扇', '吊扇', '电扇', '换气扇'],
    { type: 'fan', label: '风扇', icon: 'fan', category: 'hvac' }],

    // 新风/加湿
    [['新风', '加湿器', '除湿机', '净化器', '空气净化'],
    { type: 'air_purifier', label: '新风净化', icon: 'air-purifier', category: 'hvac' }],

    // 门锁
    [['门锁', '智能锁', '指纹锁', '密码锁'],
    { type: 'lock', label: '门锁', icon: 'lock', category: 'security' }],

    // 摄像头
    [['摄像头', '摄像机', '监控'],
    { type: 'camera', label: '摄像头', icon: 'cctv', category: 'security' }],

    // 门/窗传感器
    [['门磁', '窗磁', '门窗传感器'],
    { type: 'door_sensor', label: '门窗传感器', icon: 'door-closed', category: 'security' }],

    // 人体传感器
    [['人体', '人体传感', '存在传感', '红外传感', '人感', '雷达'],
    { type: 'motion_sensor', label: '人体传感器', icon: 'motion-sensor', category: 'sensor' }],

    // 温湿度传感器
    [['温度', '湿度', '温湿度', '温度计'],
    { type: 'temp_sensor', label: '温湿度', icon: 'thermometer', category: 'sensor' }],

    // 烟雾/水浸
    [['烟雾', '烟感', '煤气', '燃气', '天然气'],
    { type: 'smoke_sensor', label: '烟雾报警', icon: 'smoke-detector', category: 'security' }],
    [['水浸', '漏水'],
    { type: 'water_leak', label: '水浸传感器', icon: 'water-alert', category: 'security' }],

    // 电视
    [['电视', '投影', '投影仪'],
    { type: 'media', label: '电视', icon: 'television', category: 'other' }],

    // 音箱
    [['音箱', '音响', '智能音箱'],
    { type: 'speaker', label: '音箱', icon: 'speaker', category: 'other' }],

    // 扫地机
    [['扫地机', '扫地机器人', '吸尘器', '拖地机'],
    { type: 'vacuum', label: '扫地机', icon: 'robot-vacuum', category: 'other' }],

    // 遥控器
    [['遥控', '万能遥控', '红外'],
    { type: 'remote', label: '遥控器', icon: 'remote', category: 'other' }],
];

// ================================================================
// 3. domain → 默认 MDI 图标
// ================================================================
const DOMAIN_ICON_MAP: Record<string, string> = {
    light: 'lightbulb',
    switch: 'toggle-switch',
    input_boolean: 'toggle-switch',
    sensor: 'gauge',
    binary_sensor: 'motion-sensor',
    cover: 'curtains',
    climate: 'air-conditioner',
    fan: 'fan',
    humidifier: 'air-humidifier',
    media_player: 'television',
    lock: 'lock',
    camera: 'cctv',
    vacuum: 'robot-vacuum',
    alarm_control_panel: 'shield-home',
    remote: 'remote',
    water_heater: 'water-boiler',
    air_quality: 'air-filter',
    scene: 'palette',
    automation: 'robot',
    script: 'script-text',
    person: 'account',
};

// ================================================================
// 核心清洗函数
// ================================================================

/** 从 friendly_name 中提取房间名 */
export function inferRoomFromName(friendlyName: string, entityId?: string): string {
    const text = friendlyName || '';

    // 1. 从中文名匹配房间
    for (const [keyword, roomName] of ROOM_KEYWORDS) {
        if (text.includes(keyword)) {
            return roomName;
        }
    }

    // 2. 从 entity_id 匹配（英文）
    if (entityId) {
        const lower = entityId.toLowerCase();
        for (const [keyword, roomName] of ROOM_KEYWORDS) {
            if (lower.includes(keyword)) {
                return roomName;
            }
        }
    }

    return '未分配';
}

/** 从 friendly_name 和 domain 推断设备类型 */
export function inferDeviceTypeFromName(
    friendlyName: string,
    domain: string,
    deviceClass?: string,
    attributes?: any
): DeviceTypeInfo {
    const text = friendlyName || '';

    // 1. 优先从中文名匹配
    for (const [keywords, typeInfo] of DEVICE_TYPE_KEYWORDS) {
        for (const kw of keywords) {
            if (text.includes(kw)) {
                return typeInfo;
            }
        }
    }

    // 2. 基于 domain 的默认映射
    switch (domain) {
        case 'light': {
            const features = attributes?.supported_features || 0;
            if ((features & 1) !== 0) {
                return { type: 'dimmer', label: '调光灯', icon: 'lightbulb-on', category: 'lighting' };
            }
            return { type: 'light', label: '灯', icon: 'lightbulb', category: 'lighting' };
        }
        case 'switch':
        case 'input_boolean':
            if (deviceClass === 'outlet') {
                return { type: 'outlet', label: '插座', icon: 'power-socket-eu', category: 'switch' };
            }
            return { type: 'switch', label: '开关', icon: 'toggle-switch', category: 'switch' };
        case 'cover':
            return { type: 'curtain', label: '窗帘', icon: 'curtains', category: 'curtain' };
        case 'climate':
            return { type: 'ac', label: '空调', icon: 'air-conditioner', category: 'hvac' };
        case 'fan':
            return { type: 'fan', label: '风扇', icon: 'fan', category: 'hvac' };
        case 'humidifier':
            return { type: 'air_purifier', label: '加湿器', icon: 'air-humidifier', category: 'hvac' };
        case 'media_player':
            return { type: 'media', label: '媒体播放', icon: 'television', category: 'other' };
        case 'lock':
            return { type: 'lock', label: '门锁', icon: 'lock', category: 'security' };
        case 'camera':
            return { type: 'camera', label: '摄像头', icon: 'cctv', category: 'security' };
        case 'vacuum':
            return { type: 'vacuum', label: '扫地机', icon: 'robot-vacuum', category: 'other' };
        case 'remote':
            return { type: 'remote', label: '遥控器', icon: 'remote', category: 'other' };
        case 'alarm_control_panel':
            return { type: 'alarm', label: '报警器', icon: 'shield-home', category: 'security' };
        case 'person':
            return { type: 'person', label: '人员', icon: 'account', category: 'person' };
        case 'sensor':
            return inferSensorType(friendlyName, deviceClass, attributes);
        case 'binary_sensor':
            return inferBinarySensorType(friendlyName, deviceClass);
        default:
            return { type: 'other', label: '设备', icon: 'devices', category: 'other' };
    }
}

/** 传感器子类型推断 */
function inferSensorType(name: string, deviceClass?: string, attributes?: any): DeviceTypeInfo {
    const unit = attributes?.unit_of_measurement || '';

    // 按 device_class
    if (deviceClass === 'temperature' || unit === '°C' || unit === '°F' || name.includes('温度')) {
        return { type: 'temp_sensor', label: '温度', icon: 'thermometer', category: 'sensor' };
    }
    if (deviceClass === 'humidity' || unit === '%' && name.includes('湿度')) {
        return { type: 'humidity_sensor', label: '湿度', icon: 'water-percent', category: 'sensor' };
    }
    if (deviceClass === 'illuminance' || unit === 'lx' || name.includes('光照')) {
        return { type: 'light_sensor', label: '光照', icon: 'brightness-6', category: 'sensor' };
    }
    if (deviceClass === 'pm25' || name.includes('PM2.5') || name.includes('pm25')) {
        return { type: 'pm25_sensor', label: 'PM2.5', icon: 'blur', category: 'sensor' };
    }
    if (deviceClass === 'co2' || name.includes('CO2') || name.includes('二氧化碳')) {
        return { type: 'co2_sensor', label: 'CO2', icon: 'molecule-co2', category: 'sensor' };
    }
    if (deviceClass === 'power' || unit === 'W' || unit === 'kW') {
        return { type: 'power_sensor', label: '功率', icon: 'flash', category: 'sensor' };
    }
    if (deviceClass === 'energy' || unit === 'kWh') {
        return { type: 'energy_sensor', label: '电量', icon: 'lightning-bolt', category: 'sensor' };
    }
    if (deviceClass === 'battery' || unit === '%' && name.includes('电')) {
        return { type: 'battery_sensor', label: '电池', icon: 'battery', category: 'sensor' };
    }

    return { type: 'sensor', label: '传感器', icon: 'gauge', category: 'sensor' };
}

/** 二进制传感器子类型推断 */
function inferBinarySensorType(name: string, deviceClass?: string): DeviceTypeInfo {
    if (deviceClass === 'motion' || deviceClass === 'occupancy' || deviceClass === 'presence' || name.includes('人体') || name.includes('人感')) {
        return { type: 'motion_sensor', label: '人体传感器', icon: 'motion-sensor', category: 'sensor' };
    }
    if (deviceClass === 'door' || deviceClass === 'garage_door' || name.includes('门磁') || name.includes('门')) {
        return { type: 'door_sensor', label: '门磁', icon: 'door-closed', category: 'security' };
    }
    if (deviceClass === 'window' || name.includes('窗')) {
        return { type: 'window_sensor', label: '窗磁', icon: 'window-closed-variant', category: 'security' };
    }
    if (deviceClass === 'smoke' || name.includes('烟')) {
        return { type: 'smoke_sensor', label: '烟雾', icon: 'smoke-detector', category: 'security' };
    }
    if (deviceClass === 'moisture' || name.includes('水浸') || name.includes('漏水')) {
        return { type: 'water_leak', label: '水浸', icon: 'water-alert', category: 'security' };
    }

    return { type: 'binary_sensor', label: '传感器', icon: 'checkbox-marked-circle-outline', category: 'sensor' };
}

/** 从 friendly_name 中去除房间名前缀，提取纯设备名 */
export function cleanDeviceName(friendlyName: string): string {
    let name = friendlyName || '';

    // 去除常见的房间前缀
    for (const [keyword] of ROOM_KEYWORDS) {
        // 只去除 2 字以上的中文词
        if (keyword.length >= 2 && /[\u4e00-\u9fa5]/.test(keyword) && name.startsWith(keyword)) {
            name = name.slice(keyword.length);
            break;
        }
    }

    // 去除开头的分隔符
    name = name.replace(/^[\s\-_·.]+/, '');

    return name || friendlyName;
}

/** 获取 domain 默认图标 */
export function getDomainIcon(domain: string): string {
    return DOMAIN_ICON_MAP[domain] || 'devices';
}

/** 批量清洗 HA 返回的 attributes，提取有用参数 */
export function extractEntityParams(domain: string, attributes: any): Record<string, any> {
    const params: Record<string, any> = {};

    if (domain === 'climate') {
        if (attributes.temperature !== undefined) params.temperature = attributes.temperature;
        if (attributes.current_temperature !== undefined) params.current_temperature = attributes.current_temperature;
        if (attributes.hvac_modes) params.hvac_modes = attributes.hvac_modes;
        if (attributes.fan_modes) params.fan_modes = attributes.fan_modes;
        if (attributes.swing_modes) params.swing_modes = attributes.swing_modes;
        if (attributes.fan_mode) params.fan_mode = attributes.fan_mode;
        if (attributes.swing_mode) params.swing_mode = attributes.swing_mode;
        if (attributes.min_temp !== undefined) params.min_temp = attributes.min_temp;
        if (attributes.max_temp !== undefined) params.max_temp = attributes.max_temp;
        if (attributes.target_temp_step) params.target_temp_step = attributes.target_temp_step;
        if (attributes.supported_features !== undefined) params.supported_features = attributes.supported_features;
    }

    if (domain === 'light') {
        if (attributes.brightness !== undefined) params.brightness = attributes.brightness;
        if (attributes.color_temp !== undefined) params.color_temp = attributes.color_temp;
        if (attributes.min_mireds !== undefined) params.min_mireds = attributes.min_mireds;
        if (attributes.max_mireds !== undefined) params.max_mireds = attributes.max_mireds;
        if (attributes.supported_color_modes) params.supported_color_modes = attributes.supported_color_modes;
        if (attributes.supported_features !== undefined) params.supported_features = attributes.supported_features;
    }

    if (domain === 'cover') {
        if (attributes.current_position !== undefined) params.position = attributes.current_position;
        if (attributes.supported_features !== undefined) params.supported_features = attributes.supported_features;
    }

    if (domain === 'fan') {
        if (attributes.percentage !== undefined) params.percentage = attributes.percentage;
        if (attributes.preset_modes) params.preset_modes = attributes.preset_modes;
        if (attributes.preset_mode) params.preset_mode = attributes.preset_mode;
        if (attributes.supported_features !== undefined) params.supported_features = attributes.supported_features;
    }

    if (domain === 'sensor' || domain === 'binary_sensor') {
        if (attributes.unit_of_measurement) params.unit_of_measurement = attributes.unit_of_measurement;
        if (attributes.device_class) params.device_class = attributes.device_class;
    }

    return params;
}
