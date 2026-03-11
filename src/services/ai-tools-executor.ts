/**
 * AI 工具解析与执行逻辑（独立于 Hook 的服务层）
 * [architecture-expert] [backend-heavy]
 */

import { Connection, HassEntities } from 'home-assistant-js-websocket';
import { callService } from '@/utils/ha-connection';

export interface ToolCallResult {
    tool_call_id: string;
    content: string;
}

/**
 * 执行 AI 识别出的 HA 工具调用
 */
export async function executeHaTools(
    conn: Connection | null,
    entities: HassEntities,
    toolCalls: any[]
): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const tc of toolCalls) {
        const callId = tc.id;
        const fnName = tc.name;
        let resultStr = '';

        try {
            const args = typeof tc.arguments === 'string' ? JSON.parse(tc.arguments || '{}') : tc.arguments;

            if (fnName === 'call_ha_service') {
                if (!conn) throw new Error('HA 连接未激活，无法执行服务');
                await callService(conn, args.domain, args.service, args.service_data);
                resultStr = `成功执行: ${args.domain}.${args.service}`;
            } else if (fnName === 'get_entity_state') {
                const entity = entities[args.entity_id];
                if (entity) {
                    resultStr = JSON.stringify({
                        entity_id: entity.entity_id,
                        state: entity.state,
                        attributes: entity.attributes
                    });
                } else {
                    resultStr = `找不到设备状态信息: ${args.entity_id}`;
                }
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
