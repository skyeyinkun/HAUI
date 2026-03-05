export type IRTelemetryPayload = {
  deviceId: number;
  entityId: string | null;
  code: string;
  ts: string;
  ok: boolean;
  error?: string;
};

export const emitIrTelemetry = (
  input: Omit<IRTelemetryPayload, 'ts'> & { ts?: string }
): IRTelemetryPayload => {
  const payload: IRTelemetryPayload = {
    ...input,
    ts: input.ts ?? new Date().toISOString(),
  };
  window.dispatchEvent(new CustomEvent('ir:send', { detail: payload }));
  return payload;
};

