/**
 * AI 工具解析与执行逻辑（独立于 Hook 的服务层）
 * [architecture-expert] [backend-heavy]
 */

import { HassEntities } from 'home-assistant-js-websocket';
import { findEntitiesForAi, getAiEntityDisplayName, getEntityStateForAi, getHomeAssistantSummary } from '@/utils/ai-context';
import type { HAServiceCallData } from '@/types/home-assistant';

export interface ToolCallResult {
    tool_call_id: string;
    content: string;
}

export type AiCallService = (
    domain: string,
    service: string,
    data?: HAServiceCallData
) => Promise<unknown>;

type ToolArguments = Record<string, unknown>;

export interface ParsedServiceCall {
    domain: string;
    service: string;
    serviceData: HAServiceCallData;
    riskLevel: 'low' | 'confirm';
}

// 安全白名单：仅允许低风险且可被单实体约束的控制。
const ALLOWED_SERVICES: Record<string, Set<string>> = {
    light: new Set(['turn_on', 'turn_off', 'toggle']),
    switch: new Set(['turn_on', 'turn_off', 'toggle']),
    input_boolean: new Set(['turn_on', 'turn_off', 'toggle']),
    cover: new Set(['open_cover', 'close_cover', 'stop_cover', 'set_cover_position']),
    fan: new Set(['turn_on', 'turn_off', 'toggle', 'set_percentage', 'set_preset_mode']),
    media_player: new Set(['turn_on', 'turn_off', 'toggle', 'media_play_pause', 'media_play', 'media_pause', 'volume_set', 'volume_up', 'volume_down']),
    climate: new Set(['turn_on', 'turn_off', 'set_temperature', 'set_hvac_mode', 'set_fan_mode', 'set_swing_mode']),
    humidifier: new Set(['turn_on', 'turn_off', 'toggle', 'set_humidity', 'set_mode']),
    vacuum: new Set(['start', 'pause', 'stop', 'return_to_base']),
    remote: new Set(['send_command']),
    scene: new Set(['turn_on']),
    script: new Set(['turn_on']),
};

const BLOCKED_DOMAINS = new Set(['lock', 'alarm_control_panel']);
const BLOCKED_SERVICES = new Set([
    'unlock', 'open', 'disarm', 'alarm_disarm',
    'reload', 'restart', 'stop', 'shutdown',
    'turn_on_all', 'turn_off_all'
]);

/**
 * 验证服务调用是否在白名单中
 */
export function parseToolArguments(rawArguments: unknown): ToolArguments {
    if (typeof rawArguments === 'string') {
        const trimmed = rawArguments.trim();
        if (!trimmed) return {};
        const parsed = JSON.parse(trimmed);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('工具参数必须是对象');
        }
        return parsed as ToolArguments;
    }

    if (!rawArguments || typeof rawArguments !== 'object' || Array.isArray(rawArguments)) {
        return {};
    }

    return rawArguments as ToolArguments;
}

export function getServiceEntityIds(serviceData: Record<string, unknown>): string[] {
    const value = serviceData.entity_id;
    if (typeof value === 'string') return [value];
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value;
    return [];
}

function getDomain(entityId: string): string {
    return entityId.split('.')[0] || '';
}

function uniqueValues(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
}

function validateServiceCall(args: ToolArguments, entities: HassEntities): ParsedServiceCall {
    const requestedDomain = typeof args.domain === 'string' ? args.domain.trim() : '';
    const service = typeof args.service === 'string' ? args.service.trim() : '';
    const rawServiceData = args.service_data;

    if (!requestedDomain || !service) {
        throw new Error('缺少 domain 或 service');
    }

    if (BLOCKED_DOMAINS.has(requestedDomain)) {
        throw new Error(`${requestedDomain} 属于高风险域，AI 助手不会直接执行，请在 Home Assistant 中手动确认`);
    }

    if (BLOCKED_SERVICES.has(service)) {
        throw new Error(`${service} 属于高风险服务，AI 助手不会直接执行`);
    }

    if (!rawServiceData || typeof rawServiceData !== 'object' || Array.isArray(rawServiceData)) {
        throw new Error('服务调用必须包含 service_data 对象');
    }

    const serviceData = rawServiceData as Record<string, unknown>;
    const entityIds = getServiceEntityIds(serviceData);
    if (entityIds.length === 0) {
        throw new Error('服务调用必须指定明确的 entity_id');
    }
    if (entityIds.length > 5) {
        throw new Error('一次最多允许控制 5 个实体');
    }
    if (entityIds.some(entityId => entityId === 'all' || entityId.includes('*'))) {
        throw new Error('AI 助手不允许执行全域或通配符控制');
    }
    const missingEntityIds = entityIds.filter(entityId => !entities[entityId]);
    if (missingEntityIds.length > 0) {
        throw new Error(`找不到目标实体: ${missingEntityIds.join(', ')}`);
    }
    const unavailableEntityIds = entityIds.filter(entityId => {
        const state = entities[entityId]?.state;
        return state === 'unavailable' || state === 'unknown';
    });
    if (unavailableEntityIds.length > 0) {
        throw new Error(`目标实体当前不可用: ${unavailableEntityIds.join(', ')}`);
    }

    const entityDomains = uniqueValues(entityIds.map(getDomain));
    if (entityDomains.length !== 1) {
        throw new Error('一次服务调用只能控制同一域的实体');
    }

    let domain = requestedDomain;
    const actualEntityDomain = entityDomains[0];
    if (actualEntityDomain !== requestedDomain) {
        const actualAllowedServices = ALLOWED_SERVICES[actualEntityDomain];
        if (actualAllowedServices?.has(service) && !BLOCKED_DOMAINS.has(actualEntityDomain)) {
            domain = actualEntityDomain;
        } else if (requestedDomain !== 'homeassistant') {
            throw new Error('entity_id 与服务域不匹配');
        }
    }

    const allowedServices = ALLOWED_SERVICES[domain];
    if (!allowedServices || !allowedServices.has(service)) {
        throw new Error(`${domain}.${service} 不在 AI 助手允许的控制列表中`);
    }

    return {
        domain,
        service,
        serviceData: serviceData as HAServiceCallData,
        riskLevel: 'low',
    };
}

export function previewHaServiceToolCall(entities: HassEntities, toolCall: any): ParsedServiceCall & { targetNames: string[] } {
    const fn = toolCall?.function || {};
    if (fn.name !== 'call_ha_service') {
        throw new Error('不是 Home Assistant 服务调用');
    }
    const serviceCall = validateServiceCall(parseToolArguments(fn.arguments), entities);
    return {
        ...serviceCall,
        targetNames: getServiceEntityIds(serviceCall.serviceData).map((entityId) => getAiEntityDisplayName(entities, entityId)),
    };
}

/**
 * 执行 AI 识别出的 HA 工具调用
 */
export async function executeHaTools(
    entities: HassEntities,
    toolCalls: any[],
    callService?: AiCallService
): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const tc of toolCalls) {
        const callId = tc.id;
        const fn = tc.function || {};
        const fnName = fn.name;
        let resultStr = '';

        try {
            const args = parseToolArguments(fn.arguments);

            if (fnName === 'call_ha_service') {
                if (!callService) throw new Error('HA 连接未激活，无法执行服务');
                const serviceCall = validateServiceCall(args, entities);
                await callService(serviceCall.domain, serviceCall.service, serviceCall.serviceData);
                const entityIds = getServiceEntityIds(serviceCall.serviceData);
                resultStr = JSON.stringify({
                    ok: true,
                    action: `${serviceCall.domain}.${serviceCall.service}`,
                    targets: entityIds.map(entityId => getAiEntityDisplayName(entities, entityId)),
                    message: '服务调用已提交，最终状态以 Home Assistant 回传为准'
                });
            } else if (fnName === 'get_entity_state') {
                const entityId = typeof args.entity_id === 'string' ? args.entity_id.trim() : '';
                const entity = entityId ? getEntityStateForAi(entities, entityId) : null;
                if (entity) {
                    resultStr = JSON.stringify(entity);
                } else {
                    resultStr = `找不到设备状态信息: ${entityId || '未提供 entity_id'}`;
                }
            } else if (fnName === 'find_entities') {
                resultStr = JSON.stringify(findEntitiesForAi(entities, {
                    query: typeof args.query === 'string' ? args.query : '',
                    domain: typeof args.domain === 'string' ? args.domain : '',
                    limit: typeof args.limit === 'number' ? args.limit : undefined,
                    includeUnavailable: args.include_unavailable === true,
                }));
            } else if (fnName === 'get_home_summary') {
                resultStr = JSON.stringify(getHomeAssistantSummary(entities));
            } else {
                resultStr = `未知工具或不支持的操作: ${fnName}`;
            }
        } catch (e: any) {
            resultStr = `操作执行失败: ${e.message}`;
        }

        results.push({ tool_call_id: callId, content: resultStr });
    }

    return results;
}
