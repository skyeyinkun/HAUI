// =====================================================================
// AI Chat SSE Service (直接由前端发起外部请求，移除对内部后端的依赖)
// =====================================================================

import { fetchEventSource } from '@microsoft/fetch-event-source';
import { AiConfig, providerSupportsToolCalling } from './ai-service';
import { getApiUrl, readApiError } from '@/utils/sync';

export interface AiChatMessage {
    role: 'user' | 'system' | 'assistant' | 'tool';
    content: string;  // DashScope 等 API 要求 content 必须为字符串，不允许 null
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

export interface StreamEvent {
    type: 'content' | 'tool_call' | 'error' | 'done';
    content?: string;
    tool_calls?: any[];
}

function shouldUseAddonAiProxy(): boolean {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.includes('hassio_ingress');
}

function normalizeProxyToolCall(toolCall: any): any {
    return {
        ...toolCall,
        type: toolCall.type || 'function',
        function: {
            name: toolCall.function?.name || toolCall.name || '',
            arguments: toolCall.function?.arguments || toolCall.arguments || '',
        },
    };
}

export interface AiToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export function getAiHomeAssistantTools(): AiToolDefinition[] {
    return [
        {
            type: 'function',
            function: {
                name: 'get_entity_state',
                description: '按 entity_id 查询单个智能家居设备的完整当前状态。回答具体设备状态前优先使用此工具。',
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
                name: 'find_entities',
                description: '按名称、房间、类型或 entity_id 查找设备。用户没有提供明确 entity_id 时，先用此工具定位设备。',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: '搜索关键词，例如 客厅、温度、电视、light.living_room' },
                        domain: { type: 'string', description: '可选实体域，例如 light, switch, sensor, climate, cover' },
                        limit: { type: 'number', description: '返回数量上限，默认 20，最大 50' },
                        include_unavailable: { type: 'boolean', description: '是否包含 unavailable/unknown 实体，默认 false' }
                    }
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_home_summary',
                description: '获取全屋设备统计、开启中的设备和关键传感器读数。用于回答“家里现在怎么样”“统计一下”等问题。',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'call_ha_service',
                description: '调用 Home Assistant 服务来控制低风险设备。调用前必须已经明确目标 entity_id；门锁、安防、全域批量控制不允许执行。',
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
}

function sanitizeChatMessages(messages: AiChatMessage[]): AiChatMessage[] {
    return messages.map((message) => {
        const sanitized: AiChatMessage = {
            role: message.role,
            content: message.content === null || message.content === undefined
                ? ''
                : typeof message.content === 'string'
                    ? message.content
                    : JSON.stringify(message.content)
        };

        if (message.role === 'assistant' && message.tool_calls?.length) {
            sanitized.tool_calls = message.tool_calls;
        }

        if (message.role === 'tool' && message.tool_call_id) {
            sanitized.tool_call_id = message.tool_call_id;
            if (message.name) sanitized.name = message.name;
        }

        return sanitized;
    });
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
    if (shouldUseAddonAiProxy()) {
        const response = await fetch(getApiUrl('/api/ai/chat'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: sanitizeChatMessages(messages) }),
            signal,
        });

        if (!response.ok || !response.body) {
            throw new Error(await readApiError(response, 'AI 请求失败'));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let streamOpen = true;
        while (streamOpen) {
            const { done, value } = await reader.read();
            if (done) {
                streamOpen = false;
                continue;
            }
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() || '';

            for (const chunk of chunks) {
                const line = chunk.split('\n').find(item => item.startsWith('data: '));
                if (!line) continue;
                const data = line.slice(6).trim();
                if (!data) continue;
                if (data === '[DONE]') {
                    onEvent({ type: 'done' });
                    return;
                }

                try {
                    const event = JSON.parse(data);
                    if (event.type === 'content') {
                        onEvent({ type: 'content', content: event.content || '' });
                    } else if (event.type === 'tool_calls_batch') {
                        onEvent({
                            type: 'tool_call',
                            tool_calls: Array.isArray(event.tool_calls)
                                ? event.tool_calls.map(normalizeProxyToolCall)
                                : []
                        });
                    } else if (event.type === 'error') {
                        onEvent({ type: 'error', content: event.content || 'AI 请求失败' });
                    }
                } catch (err) {
                    console.warn('[AI Proxy Stream] 数据片段解析警告:', err, data);
                }
            }
        }

        onEvent({ type: 'done' });
        return;
    }

    const { apiKey, baseUrl, modelName } = config;

    if (!apiKey) throw new Error('API Key 未提供');
    if (!baseUrl) throw new Error('Base URL 未提供');
    if (!modelName) throw new Error('模型名称未提供');

    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/chat/completions`;

    const safeApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();

    const body: Record<string, unknown> = {
        model: modelName,
        messages: sanitizeChatMessages(messages),
        stream: true
    };

    const supportsTools = providerSupportsToolCalling(config);
    if (supportsTools) {
        body.tools = getAiHomeAssistantTools();
        body.tool_choice = 'auto';
    }

    if (config.provider === 'deepseek' && supportsTools) {
        // DeepSeek V4 默认开启 thinking；工具调用时需要回传 reasoning_content。
        // 当前前端不展示/持久化推理内容，因此显式关闭 thinking，避免第二轮工具回传 400。
        body.thinking = { type: 'disabled' };
    }

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

                    // 百炼 DashScope 兼容模式错误码识别
                    const dsCode = parsedErr?.error?.code || parsedErr?.code || '';
                    if (dsCode === 'InvalidApiKey') {
                        providerHint = '\n\n【百炼提示】API Key 无效或已过期，请前往百炼控制台检查。';
                    } else if (dsCode === 'Throttling') {
                        providerHint = '\n\n【百炼提示】请求频率超限，请稍后重试或升级套餐。';
                    } else if (dsCode === 'ModelNotFound') {
                        providerHint = '\n\n【百炼提示】模型不可用，请选择其他模型。';
                    }
                } catch {
                    // 忽略 JSON 解析错误
                }

                // 根据 HTTP 状态码提供中文友好提示（当未被上方特定错误码覆盖时）
                if (!providerHint) {
                    if (response.status === 401) {
                        providerHint = '\n\nAPI Key 无效或已过期，请前往服务商控制台检查。';
                    } else if (response.status === 429) {
                        providerHint = '\n\n请求频率超限，请稍后重试或升级套餐。';
                    } else if (response.status === 400) {
                        providerHint = '\n\n请求参数错误：当前模型可能不支持工具调用，或服务商对消息格式要求更严格。请尝试切换到支持工具调用的模型，例如百炼 qwen-plus / qwen-max，或 DeepSeek deepseek-chat。';
                    }
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
