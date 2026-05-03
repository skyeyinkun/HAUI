import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agentKernelApi, setAgentKernelAuthToken } from '@/services/agent-kernel-api';

describe('agentKernelApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAgentKernelAuthToken('');
    window.history.pushState(null, '', '/');
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

    setAgentKernelAuthToken('test-agent-token');
    await agentKernelApi.status();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ha-api/api/yinkun_ui/agent/status'),
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-agent-token',
          'X-HA-Authorization': 'Bearer test-agent-token',
        }),
      }),
    );
  });

  it('rejects fallback html responses instead of treating them as successful data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    );

    setAgentKernelAuthToken('test-agent-token');
    await expect(agentKernelApi.config()).rejects.toThrow('非 JSON');
  });

  it('rejects requests before fetch when the Home Assistant token is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(agentKernelApi.config()).rejects.toThrow('缺少 Home Assistant Token');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the Home Assistant API path first inside Ingress', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        primary: { label: 'Primary AI', base_url: '', api_key: '', model: '', enabled: true, timeout: 45 },
        backup: null,
        summary: null,
        summary_enabled: false,
        max_turn_steps: 6,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    window.history.pushState(null, '', '/hassio_ingress/abc123/');
    setAgentKernelAuthToken('  test-agent-token  ');
    await agentKernelApi.config();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/yinkun_ui/agent/config'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-agent-token',
        }),
      }),
    );
  });

  it('falls back to the proxy with alternate auth header when direct Ingress auth fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('401: Unauthorized', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          primary: { label: 'Primary AI', base_url: '', api_key: '', model: '', enabled: true, timeout: 45 },
          backup: null,
          summary: null,
          summary_enabled: false,
          max_turn_steps: 6,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    window.history.pushState(null, '', '/hassio_ingress/abc123/');
    setAgentKernelAuthToken('test-agent-token');
    await agentKernelApi.config();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/api/yinkun_ui/agent/config'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-agent-token',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/ha-api/api/yinkun_ui/agent/config'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-agent-token',
          'X-HA-Authorization': 'Bearer test-agent-token',
        }),
      }),
    );
  });
});
