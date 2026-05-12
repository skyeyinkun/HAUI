import { useEffect, useState } from 'react';
import { safeLocalStorage } from '@/utils/safe-storage';

export type RuntimeHost = 'ha-panel' | 'app-shell' | 'standalone';
export type ViewportClass = 'phone' | 'tablet' | 'desktop' | 'wall';

export interface AdaptiveExperience {
  host: RuntimeHost;
  viewport: ViewportClass;
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isWallPanel: boolean;
  isHaPanel: boolean;
}

function detectHost(): RuntimeHost {
  if (typeof window === 'undefined') return 'standalone';

  const params = new URLSearchParams(window.location.search);
  const explicitHost = params.get('haui_host');
  if (explicitHost === 'app') return 'app-shell';
  if (explicitHost === 'ha') return 'ha-panel';

  const standaloneDisplay = window.matchMedia?.('(display-mode: standalone)').matches;
  const navigatorStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standaloneDisplay || navigatorStandalone || params.get('app') === '1') return 'app-shell';

  const path = window.location.pathname;
  if (path.includes('hassio_ingress') || window.parent !== window) return 'ha-panel';

  return 'standalone';
}

function getViewport(width: number, height: number): ViewportClass {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const manualWallMode = safeLocalStorage.getItem('haui_wall_mode');
  if (params?.get('haui_mode') === 'wall') return 'wall';
  if (manualWallMode === '1') return 'wall';
  if (manualWallMode === '0') {
    if (width < 768) return 'phone';
    if (width < 1180) return 'tablet';
    return 'desktop';
  }
  if (width >= 1440 && height >= 820) return 'wall';
  if (width < 768) return 'phone';
  if (width < 1180) return 'tablet';
  return 'desktop';
}

function getSnapshot(): AdaptiveExperience {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const height = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewport = getViewport(width, height);
  const host = detectHost();

  return {
    host,
    viewport,
    width,
    height,
    isPhone: viewport === 'phone',
    isTablet: viewport === 'tablet',
    isWallPanel: viewport === 'wall',
    isHaPanel: host === 'ha-panel',
  };
}

export function useAdaptiveExperience(): AdaptiveExperience {
  const [state, setState] = useState<AdaptiveExperience>(() => getSnapshot());

  useEffect(() => {
    const handleResize = () => setState(getSnapshot());
    const displayMode = window.matchMedia?.('(display-mode: standalone)');

    window.addEventListener('resize', handleResize);
    window.addEventListener('haui-wall-mode-change', handleResize);
    displayMode?.addEventListener?.('change', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('haui-wall-mode-change', handleResize);
      displayMode?.removeEventListener?.('change', handleResize);
    };
  }, []);

  return state;
}
