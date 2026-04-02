import { useCallback, useRef, useEffect } from 'react';

/**
 * 防抖回调 Hook
 * 用于优化频繁触发的事件（如滑块拖动、输入框输入）
 * 
 * @param callback 实际执行的回调函数
 * @param delay 防抖延迟时间（毫秒）
 * @returns 防抖包装后的回调函数
 * 
 * @example
 * const debouncedUpdate = useDebouncedCallback((value) => {
 *   callService('light', 'turn_on', { brightness: value });
 * }, 300);
 * 
 * // 在滑块 onChange 中使用
 * <Slider onChange={(val) => debouncedUpdate(val)} />
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 使用 ref 保存最新的 callback，避免依赖变化导致防抖函数重建
  const callbackRef = useRef(callback);

  // 保持 callbackRef 始终指向最新的 callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置新的定时器，使用 ref 中的最新 callback
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay] // 只有 delay 变化时才重建防抖函数
  );

  return debouncedCallback;
}
