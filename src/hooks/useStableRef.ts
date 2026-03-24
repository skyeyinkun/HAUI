import React, { useRef, useEffect } from 'react';

/**
 * 创建稳定的引用
 * 用于存储不需要触发 re-render 的值
 * 
 * 优化说明：
 * - 当某些值（如配置对象）频繁变化但不需要触发组件重新渲染时
 * - 可以使用此 hook 存储这些值，避免 useEffect 依赖频繁变化
 * 
 * @param value 要存储的值
 * @returns 包含当前值和更新方法的 ref 对象
 */
export function useStableRef<T>(value: T) {
  const ref = useRef(value);
  
  // 每次渲染时更新 ref，但不触发 re-render
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref;
}

/**
 * 防抖 Effect hook
 * 用于延迟执行某些操作，避免频繁触发
 * 
 * @param callback 要执行的回调
 * @param delay 延迟时间（毫秒）
 * @param deps 依赖数组
 */
export function useDebouncedEffect(
  callback: () => void,
  delay: number,
  deps: unknown[]
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      callback();
    }, delay);
    
    return () => clearTimeout(timer);
  }, [...deps, delay]);
}

/**
 * 节流 Effect hook
 * 确保回调在指定时间间隔内最多执行一次
 * 
 * @param callback 要执行的回调
 * @param limit 时间间隔（毫秒）
 * @param deps 依赖数组
 */
export function useThrottledEffect(
  callback: () => void,
  limit: number,
  deps: unknown[]
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRunRef = useRef(0);
  
  useEffect(() => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= limit) {
      lastRunRef.current = now;
      callback();
    } else {
      timeoutRef.current = setTimeout(() => {
        lastRunRef.current = Date.now();
        callback();
      }, limit - (now - lastRunRef.current));
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [...deps, limit]);
}
