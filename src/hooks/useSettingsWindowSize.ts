import { useState } from 'react';
import { safeLocalStorage } from '@/utils/safe-storage';

interface WindowSize {
  width: number;
  height: number;
}

const STORAGE_KEY = 'settings_window_size';
const MIN_WIDTH = 720;
const MIN_HEIGHT = 720;

function getViewportSize(): WindowSize {
  return {
    width: window.innerWidth || window.screen.width || 1024,
    height: window.innerHeight || window.screen.height || 768,
  };
}

function clampSize(size: WindowSize): WindowSize {
  const viewport = getViewportSize();
  if (viewport.width < 768) {
    return {
      width: Math.max(320, viewport.width - 16),
      height: Math.max(520, viewport.height - 16),
    };
  }

  return {
    width: Math.min(size.width, viewport.width - 32),
    height: Math.min(size.height, viewport.height - 32),
  };
}

export function useSettingsWindowSize() {
  const [size, _setSize] = useState<WindowSize>(() => {
    // 1. Try to load from local storage
    const saved = safeLocalStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height) {
          return clampSize(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse saved window size', e);
      }
    }

    // 2. Initialize with 45% of screen size, but respect min dimensions
    // We use window.screen.width/height to get the actual screen size, 
    // or window.innerWidth/Height for the viewport if running in a normal browser window.
    // Requirement says "system current screen resolution" (系统当前屏幕分辨率).
    // In a browser, window.screen.width/height is closest to screen resolution.
    
    const screenW = window.screen.width;
    const screenH = window.screen.height;
    
    // Fallback to innerWidth if screen is weird (e.g. headless)
    const baseW = screenW || window.innerWidth;
    const baseH = screenH || window.innerHeight;

    const targetW = Math.max(MIN_WIDTH, Math.floor(baseW * 0.45));
    const targetH = Math.max(MIN_HEIGHT, Math.floor(baseH * 0.8));

    const initialSize = clampSize({ width: targetW, height: targetH });
    
    // Save immediately as per "record that size... next launch directly reuse"
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(initialSize));
    
    return initialSize;
  });

  // We do NOT listen to resize events to update this size, 
  // because the requirement says "lock resize events".
  // The size is determined at initialization (or first launch) and persisted.

  return size;
}
