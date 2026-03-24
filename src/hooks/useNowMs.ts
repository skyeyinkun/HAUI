import { useState, useEffect } from 'react';

/**
 * 获取当前时间戳
 * @param interval 更新间隔（毫秒），默认 10000ms (10秒)
 * 
 * 优化说明：
 * - 原设计 1000ms 间隔会导致所有依赖此 hook 的组件每秒重新渲染
 * - 对于大多数场景（显示时钟等），10秒间隔足够且大幅减少渲染开销
 * - 传感器等需要更频繁更新的场景应使用 useSensorTime hook
 */
export function useNowMs(interval = 10000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);

  return now;
}

/**
 * 专门用于传感器时间显示的 hook
 * 仅在需要显示相对时间（如"3分钟前"）时使用
 * 内部使用更短的更新间隔，但只在必要时触发渲染
 */
export function useSensorTime() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // 每 30 秒更新一次相对时间（显示精度）
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return now;
}

/**
 * 格式化相对时间显示
 * @param timestamp 要格式化的时间戳
 * @param nowMs 当前时间戳
 * @returns 相对时间字符串
 */
export function formatRelativeTime(timestamp: number | string | undefined, nowMs: number): string {
  if (!timestamp) return '--';
  
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = nowMs - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}
