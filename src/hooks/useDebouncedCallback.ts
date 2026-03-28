import { useCallback, useRef } from 'react';

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

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置新的定时器
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  return debouncedCallback;
}

/**
 * 带立即执行选项的防抖回调
 * 
 * @param callback 实际执行的回调函数
 * @param delay 防抖延迟时间（毫秒）
 * @param immediate 是否立即执行第一次调用
 * @returns 防抖包装后的回调函数和取消函数
 */
export function useDebouncedCallbackAdvanced<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  immediate: boolean = false
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
} {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const argsRef = useRef<Parameters<T> | null>(null);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    argsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current && argsRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      callback(...argsRef.current);
      argsRef.current = null;
    }
  }, [callback]);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      argsRef.current = args;

      const callNow = immediate && !timeoutRef.current;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (!immediate && argsRef.current) {
          callback(...argsRef.current);
          argsRef.current = null;
        }
      }, delay);

      if (callNow) {
        callback(...args);
      }
    },
    [callback, delay, immediate]
  );

  return { debounced, cancel, flush };
}
