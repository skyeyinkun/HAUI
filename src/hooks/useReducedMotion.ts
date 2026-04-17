import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';

/**
 * 检测系统是否偏好减少动画
 * 同时支持手动设置覆盖系统偏好
 * 
 * @returns {Object} {
 *   reduceMotion: boolean - 是否减少动画
 *   setReduceMotion: (value: boolean) => void - 手动设置
 *   isSystemPreference: boolean - 是否是系统偏好
 * }
 * 
 * @example
 * const { reduceMotion } = useReducedMotion();
 * 
 * // 在组件中使用
 * <motion.div
 *   animate={reduceMotion ? {} : { scale: 1.1 }}
 * >
 *   内容
 * </motion.div>
 */
export function useReducedMotion() {
  const { reduceMotion: storedPreference, setReduceMotion: setStoredPreference } = useUIStore();
  
  // 检测系统偏好
  const [systemPreference, setSystemPreference] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  });

  // 监听系统偏好变化
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPreference(event.matches);
    };

    // 现代浏览器使用 addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      // 旧版浏览器兼容
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // 最终是否减少动画：优先使用手动设置，如果没有则使用系统偏好
  const reduceMotion = storedPreference ?? systemPreference;
  
  // 是否是系统偏好（而非手动设置）
  const isSystemPreference = storedPreference === null || storedPreference === undefined;

  return {
    reduceMotion,
    setReduceMotion: setStoredPreference,
    isSystemPreference,
    systemPreference,
  };
}

/**
 * 简单的减少动画检测 Hook
 * 仅返回是否减少动画，用于快速判断
 */
export function useReducedMotionSimple(): boolean {
  const { reduceMotion } = useReducedMotion();
  return reduceMotion;
}
