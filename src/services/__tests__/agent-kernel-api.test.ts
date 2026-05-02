import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agentKernelApi } from '@/services/agent-kernel-api';

describe('agentKernelApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('routes agent requests through the Home Assistant proxy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        ok: true,
        stage: 1,
        stages_enabled: [1, 2, 3, 4, 5, 6],
        kernel: 'HAUI Agent Kernel',
        config: {
          primary: { label: 'Primary AI', base_url: '', api_key: '', model: '', enabled: true, timeout: 45 },
          backup: null,
          summary: null,
          summary_enabled: false,
          max_turn_steps: 6,
        },
        tool_count: 0,
        implemented_tool_count: 0,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await agentKernelApi.status();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ha-api/api/yinkun_ui/agent/status'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('rejects fallback html responses instead of treating them as successful data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    await expect(agentKernelApi.config()).rejects.toThrow('非 JSON');
  });
});
