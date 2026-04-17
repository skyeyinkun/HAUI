// =====================================================================
// AI Chat SSE Service (直接由前端发起外部请求，移除对内部后端的依赖)
// =====================================================================

import { fetchEventSource } from '@microsoft/fetch-event-source';
import { AiConfig } from './ai-service';

export interface AiChatMessage {
    role: 'user' | 'system' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

export interface StreamEvent {
    type: 'content' | 'tool_call' | 'error' | 'done';
    content?: string;
    tool_calls?: any[];
}

/**
 * 通过 fetch-event-source 直接与兼容 OpenAI 格式的流式接口进行通信
 */
export async function chatStream(
    messages: AiChatMessage[],
    config: AiConfig,
    signal: AbortSignal,
    onEvent: (event: StreamEvent) => void
): Promise<void> {
    const { apiKey, baseUrl, modelName } = config;

    if (!apiKey) throw new Error('API Key 未提供');
    if (!baseUrl) throw new Error('Base URL 未提供');
    if (!modelName) throw new Error('模型名称未提供');

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/chat/completions`;

    const safeApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();

    const tools = [
        {
            type: 'function',
            function: {
                name: 'get_entity_state',
                description: '查询单个智能家居设备的当前状态',
                parameters: {
                    type: 'object',
                    properties: {
                        entity_id: { type: 'string', description: '设备实体 ID，例如 light.living_room' }
                    },
                    required: ['entity_id']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'call_ha_service',
                description: '调用 Home Assistant 服务来控制设备',
                parameters: {
                    type: 'object',
                    properties: {
                        domain: { type: 'string', description: '服务域，例如 light, switch' },
                        service: { type: 'string', description: '服务名称，例如 turn_on, turn_off' },
                        service_data: {
                            type: 'object',
                            description: '服务参数数据，包含 entity_id 等',
                            additionalProperties: true
                        }
                    },
                    required: ['domain', 'service', 'service_data']
                }
            }
        }
    ];

    const body = {
        model: modelName,
        messages,
        stream: true,
        tools,
        tool_choice: 'auto'
    };

    const toolCallsMap: Record<number, any> = {};

    await fetchEventSource(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${safeApiKey}`
        },
        body: JSON.stringify(body),
        signal,
        async onopen(response) {
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                let errorMsg = `HTTP Error ${response.status}: ${errText}`;
                let providerHint = '';
                try {
                    const parsedErr = JSON.parse(errText);
                    errorMsg = parsedErr.error?.message || parsedErr.error || errorMsg;
                    // 检测 SiliconFlow 特定错误码
                    if (parsedErr.code === 20015) {
                        providerHint = '\n\n【SiliconFlow 服务商提示】\n错误码 20015 表示请求消息格式非法。可能原因：\n1. API Key 无效或已过期\n2. 账户余额不足\n3. 模型名称错误\n请检查 AI 设置中的配置信息。';
                    }
                } catch {
                    // 忽略解析错误
                }
                throw new Error(errorMsg + providerHint);
            }
        },
        onmessage(msg) {
            if (msg.data === '[DONE]') {
                if (Object.keys(toolCallsMap).length > 0) {
                    const sortedIndices = Object.keys(toolCallsMap).map(Number).sort((a, b) => a - b);
                    const toolCalls = sortedIndices.map(idx => toolCallsMap[idx]);
                    onEvent({ type: 'tool_call', tool_calls: toolCalls });
                }
                onEvent({ type: 'done' });
                return;
            }

            try {
                const parsed = JSON.parse(msg.data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) return;

                if (delta.content) {
                    onEvent({ type: 'content', content: delta.content });
                }

                if (delta.tool_calls && delta.tool_calls.length > 0) {
                    for (const tc of delta.tool_calls) {
                        const index = tc.index;
                        if (!toolCallsMap[index]) {
                            toolCallsMap[index] = {
                                id: tc.id || '',
                                type: tc.type || 'function',
                                function: { name: tc.function?.name || '', arguments: '' }
                            };
                        }
                        if (tc.id) toolCallsMap[index].id = tc.id;
                        // 处理工具名称：如果已存在且新名称不同，则忽略（避免重复拼接）
                        if (tc.function?.name) {
                            const existingName = toolCallsMap[index].function.name;
                            const newName = tc.function.name;
                            // 只有当名称为空，或是相同名称时才赋值
                            if (!existingName) {
                                toolCallsMap[index].function.name = newName;
                            } else if (existingName !== newName && !existingName.includes(newName)) {
                                // 如果名称已存在且不同，可能是新工具调用，不追加
                                console.warn('[AI Stream] 工具名称不一致，忽略:', existingName, 'vs', newName);
                            }
                        }
                        if (tc.function?.arguments) toolCallsMap[index].function.arguments += tc.function.arguments;
                    }
                }
            } catch (err) {
                console.warn('[AI Stream] 数据片段解析警告:', err, msg.data);
            }
        },
        onerror(err) {
            onEvent({ type: 'error', content: err.message || '网络连接中断' });
            throw err;
        }
    });
}
