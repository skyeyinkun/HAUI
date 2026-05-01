type IconTelemetryEvent =
  | {
      type: 'perf';
      name: string;
      durationMs: number;
      ts: number;
      extra?: Record<string, unknown>;
    }
  | {
      type: 'error';
      name: string;
      message: string;
      ts: number;
      extra?: Record<string, unknown>;
    };

const MAX_EVENTS = 300;
const DEDUPE_WINDOW_MS = 30_000;

const buffer: IconTelemetryEvent[] = [];
const lastSeen = new Map<string, number>();

function pushEvent(evt: IconTelemetryEvent) {
  buffer.push(evt);
  if (buffer.length > MAX_EVENTS) buffer.splice(0, buffer.length - MAX_EVENTS);
}

function shouldDedupe(key: string, now: number) {
  const prev = lastSeen.get(key);
  if (prev && now - prev < DEDUPE_WINDOW_MS) return true;
  lastSeen.set(key, now);
  return false;
}

export function recordIconPerf(name: string, durationMs: number, extra?: Record<string, unknown>) {
  const ts = Date.now();
  pushEvent({ type: 'perf', name, durationMs, ts, extra });
}

export function recordIconError(name: string, message: string, extra?: Record<string, unknown>) {
  const ts = Date.now();
  const key = `error:${name}:${message}`;
  if (shouldDedupe(key, ts)) return;
  pushEvent({ type: 'error', name, message, ts, extra });
}

export function getIconTelemetrySnapshot() {
  return buffer.slice();
}

export function isIconDebugEnabled() {
  try {
    return localStorage.getItem('debug-icons') === '1';
  } catch {
    return false;
  }
}

