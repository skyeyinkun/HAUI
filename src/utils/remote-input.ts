export type RemoteKeyCode =
  | 'power'
  | 'mute'
  | 'home'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'vol_up'
  | 'vol_down'
  | 'ch_up'
  | 'ch_down';

export type RemoteInputTelemetry = {
  code: RemoteKeyCode;
  source: 'pointer' | 'keyboard';
  atMs: number;
  accepted: boolean;
};

type NowFn = () => number;

const defaultNow: NowFn = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

export const createRemoteInputController = (opts: {
  send: (code: RemoteKeyCode) => void;
  minIntervalMs?: number;
  now?: NowFn;
  onTelemetry?: (evt: RemoteInputTelemetry) => void;
}) => {
  const minIntervalMs = opts.minIntervalMs ?? 15;
  const now = opts.now ?? defaultNow;

  let state: 'idle' | 'pressed' = 'idle';
  let armedCode: RemoteKeyCode | null = null;
  let armedPointerId: number | null = null;
  const lastFiredAtByCode = new Map<RemoteKeyCode, number>();
  let lastPointerUpAt = -Infinity;

  const tryFire = (code: RemoteKeyCode, source: RemoteInputTelemetry['source']) => {
    const atMs = now();
    const last = lastFiredAtByCode.get(code) ?? -Infinity;
    const accepted = atMs - last >= minIntervalMs;
    if (accepted) {
      lastFiredAtByCode.set(code, atMs);
      opts.send(code);
    }
    opts.onTelemetry?.({ code, source, atMs, accepted });
    return accepted;
  };

  const reset = () => {
    state = 'idle';
    armedCode = null;
    armedPointerId = null;
  };

  const handlersFor = (code: RemoteKeyCode) => {
    return {
      onClick: (e: any) => {
        e?.stopPropagation?.();
        const atMs = now();
        if (atMs - lastPointerUpAt < 80) return;
        tryFire(code, 'pointer');
      },
      onPointerDown: (e: any) => {
        if (e?.button !== undefined && e.button !== 0) return;
        state = 'pressed';
        armedCode = code;
        armedPointerId = typeof e.pointerId === 'number' ? e.pointerId : null;
        try {
          e.currentTarget?.setPointerCapture?.(e.pointerId);
        } catch {
          // ignore
        }
        e.stopPropagation?.();
        e.preventDefault?.();
      },
      onPointerUp: (e: any) => {
        const matches = state === 'pressed' && armedCode === code;
        if (matches) {
          tryFire(code, 'pointer');
        }
        lastPointerUpAt = now();
        try {
          if (armedPointerId !== null) e.currentTarget?.releasePointerCapture?.(armedPointerId);
        } catch {
          // ignore
        }
        reset();
      },
      onPointerCancel: () => {
        reset();
      },
      onPointerLeave: () => {
        if (state === 'pressed') reset();
      },
      onKeyDown: (e: any) => {
        const key = String(e?.key || '');
        if (key === 'Enter' || key === ' ') {
          e.preventDefault?.();
          e.stopPropagation?.();
          tryFire(code, 'keyboard');
        }
      },
    } as const;
  };

  return { handlersFor };
};
