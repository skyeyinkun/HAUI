// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { emitIrTelemetry } from '@/utils/ir-telemetry';

describe('emitIrTelemetry', () => {
  it('dispatches ir:send CustomEvent with payload and timestamp', () => {
    const spy = vi.fn();
    window.addEventListener('ir:send', spy as any);

    const payload = emitIrTelemetry({
      deviceId: 1,
      entityId: 'remote.living_room',
      code: 'power',
      ok: true,
      ts: '2026-02-03T00:00:00.000Z',
    });

    expect(payload.ts).toBe('2026-02-03T00:00:00.000Z');
    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe('ir:send');
    expect(event.detail).toMatchObject({
      deviceId: 1,
      entityId: 'remote.living_room',
      code: 'power',
      ok: true,
      ts: '2026-02-03T00:00:00.000Z',
    });
  });
});

