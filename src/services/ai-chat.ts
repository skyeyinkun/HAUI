// =====================================================================
// AI Chat SSE Service (对接后端的 /api/ai/chat)
// =====================================================================

export interface AiChatMessage {
    role: 'user' | 'ai' | 'system';
    content: string;
}

export interface StreamEvent {
    type: 'content' | 'tool_call' | 'error' | 'done';
    content?: string;
    action?: string;
    data?: any;
}

export async function chatStream(
    messages: AiChatMessage[],
    haToken: string | null,
    onEvent: (event: StreamEvent) => void
): Promise<void> {
    const isDev = import.meta.env.DEV;
    // 兼容本地调试与 HA Ingress
    const base = isDev ? 'http://localhost:8099' : '';
    const url = `${base}/api/ai/chat`;

    const payload = {
        messages,
        token: haToken || ''
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 400 || response.status === 500) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.error || `请求失败 (${response.status})`);
            }
            throw new Error(`网络请求失败: ${response.status}`);
        }

        if (!response.body) {
            throw new Error('ReadableStream not supported by browser.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                onEvent({ type: 'done' });
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') {
                    onEvent({ type: 'done' });
                    continue;
                }

                try {
                    const parsed = JSON.parse(dataStr);
                    onEvent({
                        type: parsed.type || 'content',
                        content: parsed.content,
                        action: parsed.action,
                        data: parsed.data
                    });
                } catch (e) {
                    console.warn('[AI Service] SSE Parse error:', e, dataStr);
                }
            }
        }
    } catch (error: any) {
        onEvent({ type: 'error', content: error.message || '网络连接中断' });
    }
}
