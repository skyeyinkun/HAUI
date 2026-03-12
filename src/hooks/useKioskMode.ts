import { useState, useEffect, useCallback } from 'react';

export function useKioskMode(shouldEnable: boolean) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Fullscreen Toggle Function
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Error attempting to toggle fullscreen:', err);
    }
  }, []);

  // 2. CSS Injection for HA UI Hiding (The "Kiosk" part)
  useEffect(() => {
    if (!shouldEnable) return;

    // We need to try to inject this periodically or when load completes, 
    // because HA might re-render or we might be in a race condition.
    // However, we are restricted by cross-origin if we are in a different frame.
    // If Ingress, we are same-origin.

    const hideHAElements = () => {
      try {
        // Check if we are inside HA (iframe)
        if (window.parent === window) return;

        // Try to access parent document (Same Origin Policy might block this if not Ingress)
        const parentDoc = window.parent.document;
        
        const css = `
          /* Hide HA Sidebar */
          app-drawer { display: none !important; }
          
          /* Hide HA Header/Toolbar */
          app-header, 
          app-toolbar,
          ha-menu-button,
          ha-top-app-bar-fixed { display: none !important; }
          
          /* Hide "More Info" dialogs if they pop up outside (unlikely) */
          
          /* Maximize the iframe container area */
          .main-content { margin-left: 0 !important; }
          #view { padding: 0 !important; margin: 0 !important; height: 100vh !important; }
          
          /* Hide Kiosk Mode Helper elements if they exist */
          #kiosk-mode { display: none; }
        `;

        // Check if style already exists
        if (!parentDoc.getElementById('yinkun-kiosk-style')) {
          const style = parentDoc.createElement('style');
          style.id = 'yinkun-kiosk-style';
          style.type = 'text/css';
          style.appendChild(parentDoc.createTextNode(css));
          parentDoc.head.appendChild(style);
          console.log('[YINKUN_UI] Kiosk styles injected into parent.');
        }

        // Force trigger a resize to fix layout
        window.parent.dispatchEvent(new Event('resize'));
        
      } catch (e) {
        console.warn('[YINKUN_UI] Failed to inject Kiosk styles into parent (Cross-Origin?):', e);
      }
    };

    // Attempt immediately
    hideHAElements();

    // Attempt periodically for a few seconds to catch HA loading
    const intervalId = setInterval(hideHAElements, 2000);
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      // Optional: Remove styles on disable? 
      // Usually users want them gone only if they turn off the setting, 
      // but for now let's leave them or user needs to refresh HA.
      try {
        if (window.parent !== window) {
           const style = window.parent.document.getElementById('yinkun-kiosk-style');
           if (style) style.remove();
        }
      } catch (e) {
        // ignore
      }
    };
  }, [shouldEnable]);

  // Sync fullscreen state
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  return { isFullscreen, toggleFullscreen };
}
