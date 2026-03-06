
// Map common Chinese smart home terms to English MDI keywords
export const CN_TO_EN_KEYWORDS: Record<string, string[]> = {
  // 气候/环境
  '温度': ['thermometer', 'temperature', 'heat', 'cool'],
  '湿度': ['water-percent', 'humidity', 'water', 'drop'],
  '空气': ['air', 'filter', 'purifier', 'fan'],
  '风扇': ['fan', 'wind'],
  '空调': ['air-conditioner', 'snowflake', 'fire'],
  '暖气': ['radiator', 'fire', 'heat'],
  '光照': ['brightness', 'sun', 'light', 'white-balance'],
  '太阳': ['sun', 'weather-sunny'],
  
  // 灯光
  '灯': ['light', 'lamp', 'bulb', 'led'],
  '开关': ['switch', 'toggle', 'power'],
  '插座': ['power-socket', 'outlet', 'plug'],
  
  // 安防
  '门': ['door', 'gate'],
  '窗': ['window', 'blinds', 'curtain'],
  '锁': ['lock', 'key', 'shield'],
  '人': ['account', 'face', 'human', 'walk', 'run'],
  '运动': ['motion', 'run', 'walk', 'radar'],
  '烟': ['smoke', 'fire', 'alert'],
  '水': ['water', 'leak', 'drop'],
  '电池': ['battery', 'power'],
  
  // 媒体
  '电视': ['television', 'monitor', 'screen'],
  '音乐': ['music', 'speaker', 'play'],
  '音箱': ['speaker', 'audio'],
  '播放': ['play', 'pause', 'stop'],
  
  // 房间
  '客厅': ['sofa', 'television', 'seat'],
  '卧室': ['bed', 'sleep'],
  '厨房': ['chef', 'pot', 'fridge', 'microwave'],
  '厕所': ['toilet', 'shower', 'bath'],
  '浴室': ['bath', 'shower', 'water'],
  '书房': ['book', 'desk', 'read'],
  
  // 通用
  '设置': ['cog', 'settings', 'tune'],
  '主页': ['home', 'house'],
  '网络': ['wifi', 'network', 'web'],
  '链接': ['link', 'connection'],
  '时间': ['clock', 'time', 'timer', 'calendar'],
  '天气': ['weather', 'cloud', 'rain', 'snow'],
};

export const PINYIN_TO_EN_KEYWORDS: Record<string, string[]> = {
  wendu: ['thermometer', 'temperature', 'heat', 'cool'],
  shidu: ['water-percent', 'humidity', 'water', 'drop'],
  kongqi: ['air', 'filter', 'purifier', 'fan'],
  fengshan: ['fan', 'wind'],
  kongtiao: ['air-conditioner', 'snowflake', 'fire'],
  nuanqi: ['radiator', 'fire', 'heat'],
  guangzhao: ['brightness', 'sun', 'light', 'white-balance'],
  taiyang: ['sun', 'weather-sunny'],
  deng: ['light', 'lamp', 'bulb', 'led'],
  kaiguan: ['switch', 'toggle', 'power'],
  chazuo: ['power-socket', 'outlet', 'plug'],
  men: ['door', 'gate'],
  chuang: ['window', 'blinds', 'curtain'],
  suo: ['lock', 'key', 'shield'],
  ren: ['account', 'face', 'human', 'walk', 'run'],
  yundong: ['motion', 'run', 'walk', 'radar'],
  yan: ['smoke', 'fire', 'alert'],
  shui: ['water', 'leak', 'drop'],
  dianchi: ['battery', 'power'],
  dianshi: ['television', 'monitor', 'screen'],
  yinyue: ['music', 'speaker', 'play'],
  yinxiang: ['speaker', 'audio'],
  bofang: ['play', 'pause', 'stop'],
  keting: ['sofa', 'television', 'seat'],
  woshi: ['bed', 'sleep'],
  chufang: ['chef', 'pot', 'fridge', 'microwave'],
  cesuo: ['toilet', 'shower', 'bath'],
  yushi: ['bath', 'shower', 'water'],
  shufang: ['book', 'desk', 'read'],
  shezhi: ['cog', 'settings', 'tune'],
  zhuye: ['home', 'house'],
  wangluo: ['wifi', 'network', 'web'],
  lianjie: ['link', 'connection'],
  shijian: ['clock', 'time', 'timer', 'calendar'],
  tianqi: ['weather', 'cloud', 'rain', 'snow'],
};

export function getEnglishKeywords(input: string): string[] {
  const q = input.trim().toLowerCase();
  const results: Set<string> = new Set();
  
  // Direct match
  if (CN_TO_EN_KEYWORDS[q]) {
    CN_TO_EN_KEYWORDS[q].forEach(k => results.add(k));
  }
  
  // Partial match
  Object.keys(CN_TO_EN_KEYWORDS).forEach(cnKey => {
    if (q.includes(cnKey) || cnKey.includes(q)) {
      CN_TO_EN_KEYWORDS[cnKey].forEach(k => results.add(k));
    }
  });

  if (/^[a-z]+$/.test(q) && q.length >= 3) {
    if (PINYIN_TO_EN_KEYWORDS[q]) {
      PINYIN_TO_EN_KEYWORDS[q].forEach(k => results.add(k));
    }
    Object.keys(PINYIN_TO_EN_KEYWORDS).forEach(pyKey => {
      if (q.includes(pyKey) || pyKey.includes(q)) {
        PINYIN_TO_EN_KEYWORDS[pyKey].forEach(k => results.add(k));
      }
    });
  }
  
  return Array.from(results);
}
