export const cleanLogMessage = (message: string): string => {
  // 1. Round numbers to 2 decimals
  let cleaned = message.replace(/(\d+\.\d{3,})/g, (match) => {
      return parseFloat(match).toFixed(2);
  });

  // 2. Translate common English terms
  const translations: Record<string, string> = {
      'on': '打开',
      'off': '关闭',
      'open': '打开',
      'closed': '关闭',
      'detected': '触发',
      'clear': '正常',
      'unavailable': '不可用',
      'unknown': '未知',
      'home': '在家',
      'not_home': '离家',
      'turning on': '正在打开',
      'turning off': '正在关闭',
      'changed to': '变为',
  };

  // Replace whole words (simple approach)
  Object.entries(translations).forEach(([key, value]) => {
      // Case insensitive replace
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      cleaned = cleaned.replace(regex, value);
  });

  return cleaned;
};
