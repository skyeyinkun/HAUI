import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatStream } from '@/services/ai-chat';

const fetchEventSourceMock = vi.hoisted(() => vi.fn());

vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: fetchEventSourceMock,
}));

describe('chatStream', () => {
  afterEach(() => {
    fetchEventSourceMock.mockReset();
    vi.restoreAllMocks();
    window.history.pushState(null, '', '/');
  });

  it('sanitizes message content and includes tools for tool-capable models', async () => {
    fetchEventSourceMock.mockResolvedValue(undefined);

    await chatStream([
      { role: 'system', content: 'system' },
      { role: 'assistant', content: null as unknown as string },
    ], {
      provider: 'alibaba',
      apiKey: 'test-key',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      modelName: 'qwen-plus',
    }, new AbortController().signal, vi.fn());

    const [, request] = fetchEventSourceMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.messages[1].content).toBe('');
    expect(body.tools.map((tool: any) => tool.function.name)).toContain('get_home_summary');
    expect(body.tool_choice).toBe('auto');
  });

  it('omits tools for query-only models', async () => {
    fetchEventSourceMock.mockResolvedValue(undefined);

    await chatStream([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'hello' },
    ], {
      provider: 'deepseek',
      apiKey: 'test-key',
      baseUrl: 'https://api.deepseek.com',
      modelName: 'deepseek-reasoner',
    }, new AbortController().signal, vi.fn());

    const [, request] = fetchEventSourceMock.mock.calls[0];
    const body = JSON.parse(request.body);
    expect(body.tools).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
    expect(body.thinking).toBeUndefined();
  });

  it('uses Add-on AI proxy in Home Assistant Ingress without requiring browser API key', async () => {
    window.history.pushState(null, '', '/hassio_ingress/abc123/');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"content","content":"ok"}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(stream, { status: 200 }));
    const onEvent = vi.fn();

    await chatStream([
      { role: 'system', content: 'system' },
      { role: 'user', content: 'hello' },
    ], {
      provider: 'alibaba',
      apiKey: '',
      baseUrl: '',
      modelName: '',
    }, new AbortController().signal, onEvent);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/hassio_ingress/abc123/api/ai/chat',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(fetchEventSourceMock).not.toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledWith({ type: 'content', content: 'ok' });
    expect(onEvent).toHaveBeenCalledWith({ type: 'done' });
  });
});
