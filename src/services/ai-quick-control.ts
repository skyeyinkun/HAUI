import { HassEntities } from 'home-assistant-js-websocket';
import { AiCallService, executeHaTools, ToolCallResult } from '@/services/ai-tools-executor';
import type { HAServiceCallData } from '@/types/home-assistant';

type ControlAction = 'turn_on' | 'turn_off';

interface ParsedControlRequest {
    action: ControlAction;
    actionLabel: string;
    targetText: string;
}

interface EntityCandidate {
    entityId: string;
    name: string;
    domain: string;
    score: number;
}

export interface QuickControlExecutePlan {
    kind: 'execute';
    pendingMessage: string;
    actionLabel: string;
    displayName: string;
    toolCall: {
        id: string;
        function: {
            name: 'call_ha_service';
            arguments: string;
        };
    };
}

export interface QuickControlFailPlan {
    kind: 'fail';
    finalMessage: string;
}

export type QuickControlPlan = QuickControlExecutePlan | QuickControlFailPlan | null;

const CONTROLLABLE_DOMAINS = new Set([
    'light',
    'switch',
    'input_boolean',
    'cover',
    'fan',
    'media_player',
    'climate',
    'humidifier',
    'vacuum',
    'scene',
    'script',
]);

const FILLER_PATTERN = /^(请|麻烦|帮我|给我|帮忙|可以|能不能|把|将|一下|下|设备|这个|那个|吧|呢|啊|呀)+|(?:请|麻烦|帮我|给我|帮忙|可以|能不能|把|将|一下|下|设备|这个|那个|吧|呢|啊|呀)+$/g;
const STRUCTURAL_PARTICLE_PATTERN = /(里面|里边|之中|当中|的|了|着|过|里|内)/g;
const QUICK_CONTROL_TIMEOUT_MS = 5000;

function getDomain(entityId: string): string {
    return entityId.split('.')[0] || '';
}

function getEntityName(entity: HassEntities[string]): string {
    return String(entity.attributes?.friendly_name || entity.entity_id.split('.')[1] || entity.entity_id);
}

function getEntityNameCandidates(entity: HassEntities[string]): string[] {
    const aliases = entity.attributes?.aliases;
    const candidates = [
        getEntityName(entity),
        typeof entity.attributes?.name === 'string' ? entity.attributes.name : '',
        ...(Array.isArray(aliases) ? aliases.filter((item): item is string => typeof item === 'string') : []),
    ];

    return [...new Set(candidates.map(item => item.trim()).filter(Boolean))];
}

function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[，。！？,.!?;；：:\s_-]/g, '')
        .trim();
}

function normalizeComparableText(text: string): string {
    return normalizeText(text).replace(STRUCTURAL_PARTICLE_PATTERN, '');
}

function getComparableVariants(text: string): string[] {
    const base = normalizeText(text);
    const compact = normalizeComparableText(text);
    return [...new Set([base, compact].filter(Boolean))];
}

function removeFiller(text: string): string {
    let next = text;
    let prev = '';
    while (next && next !== prev) {
        prev = next;
        next = next.replace(FILLER_PATTERN, '');
    }
    return next;
}

function parseControlRequest(rawText: string): ParsedControlRequest | null {
    const text = normalizeText(rawText);
    if (!text) return null;

    const onMatch = text.match(/打开|开启|启动|开一下|开开|^开(?!关|始)/);
    const offMatch = text.match(/关闭|关掉|关上|关一下|关了|^关(?!于|灯|门|窗|开关)/);
    const match = offMatch || onMatch;
    if (!match || match.index === undefined) return null;

    const action: ControlAction = offMatch ? 'turn_off' : 'turn_on';
    const actionLabel = action === 'turn_on' ? '打开' : '关闭';
    const targetText = removeFiller(
        `${text.slice(0, match.index)}${text.slice(match.index + match[0].length)}`
    );

    if (!targetText) return null;

    return { action, actionLabel, targetText };
}

function getDomainHints(targetText: string): string[] {
    const hints: string[] = [];

    if (/灯|light|lamp/.test(targetText)) hints.push('light', 'switch');
    if (/窗帘|窗纱|卷帘|cover|curtain/.test(targetText)) hints.push('cover');
    if (/开关|插座|switch|plug/.test(targetText)) hints.push('switch', 'input_boolean');
    if (/风扇|fan/.test(targetText)) hints.push('fan');
    if (/空调|温控|climate|ac/.test(targetText)) hints.push('climate');
    if (/加湿|humidifier/.test(targetText)) hints.push('humidifier');
    if (/电视|音响|播放器|media/.test(targetText)) hints.push('media_player', 'switch');
    if (/扫地|机器人|吸尘|vacuum/.test(targetText)) hints.push('vacuum');
    if (/场景|scene/.test(targetText)) hints.push('scene');
    if (/脚本|script/.test(targetText)) hints.push('script');

    return [...new Set(hints)];
}

function isUnavailable(state: string): boolean {
    return state === 'unavailable' || state === 'unknown';
}

function isSubsequence(needle: string, haystack: string): boolean {
    if (!needle) return false;
    let index = 0;
    for (const char of haystack) {
        if (char === needle[index]) index += 1;
        if (index === needle.length) return true;
    }
    return false;
}

function scoreEntity(targetText: string, entityId: string, name: string): number {
    const targets = getComparableVariants(targetText);
    const names = getComparableVariants(name);
    const ids = getComparableVariants(entityId);
    const localIds = getComparableVariants(entityId.split('.')[1] || entityId);

    let bestScore = 0;

    for (const target of targets) {
        for (const normalizedName of names) {
            if (target === normalizedName) bestScore = Math.max(bestScore, 1000);
            if (normalizedName.includes(target)) {
                bestScore = Math.max(bestScore, 850 - Math.min(Math.max(normalizedName.length - target.length, 0), 100));
            }
            if (target.includes(normalizedName)) {
                bestScore = Math.max(bestScore, 760 - Math.min(Math.max(target.length - normalizedName.length, 0), 100));
            }
            if (isSubsequence(target, normalizedName)) {
                bestScore = Math.max(bestScore, 640 - Math.min(Math.max(normalizedName.length - target.length, 0), 100));
            }

            const targetChars = [...new Set(target)];
            const hitCount = targetChars.filter(char => normalizedName.includes(char)).length;
            if (targetChars.length >= 2 && hitCount === targetChars.length) {
                bestScore = Math.max(bestScore, 520 - normalizedName.length);
            }
        }

        if (ids.includes(target) || localIds.includes(target)) bestScore = Math.max(bestScore, 1000);
        if (ids.some(id => id.includes(target)) || localIds.some(id => id.includes(target))) {
            bestScore = Math.max(bestScore, 700);
        }
    }

    return bestScore;
}

function resolveTarget(entities: HassEntities, targetText: string): EntityCandidate | { error: string } {
    const domainHints = getDomainHints(targetText);
    const allowedDomains = domainHints.length > 0 ? new Set(domainHints) : CONTROLLABLE_DOMAINS;
    const candidates = Object.values(entities)
        .map(entity => {
            const domain = getDomain(entity.entity_id);
            if (!CONTROLLABLE_DOMAINS.has(domain) || !allowedDomains.has(domain)) return null;
            if (isUnavailable(entity.state)) return null;

            const name = getEntityName(entity);
            const score = Math.max(
                ...getEntityNameCandidates(entity).map(candidateName => scoreEntity(targetText, entity.entity_id, candidateName))
            );
            if (score <= 0) return null;

            return {
                entityId: entity.entity_id,
                name,
                domain,
                score: score + (domainHints.includes(domain) ? 30 : 0),
            };
        })
        .filter((item): item is EntityCandidate => Boolean(item))
        .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
        return { error: `未找到“${targetText}”` };
    }

    const best = candidates[0];
    const closeMatches = candidates.filter(candidate => best.score - candidate.score < 80);
    const normalizedTarget = normalizeComparableText(targetText);
    const targetIsGeneric = /^(灯|主灯|开关|窗帘|风扇|空调|加湿器|电视|扫地机器人)$/.test(normalizedTarget);

    if (closeMatches.length > 1 || targetIsGeneric) {
        const names = candidates.slice(0, 3).map(candidate => candidate.name).join('、');
        return { error: `找到多个设备，请说具体名称：${names}` };
    }

    return best;
}

function getServiceForAction(domain: string, action: ControlAction): string | null {
    if (domain === 'cover') return action === 'turn_on' ? 'open_cover' : 'close_cover';
    if (domain === 'vacuum') return action === 'turn_on' ? 'start' : 'return_to_base';
    if (domain === 'scene' || domain === 'script') return action === 'turn_on' ? 'turn_on' : null;
    return action;
}

function makeToolCall(domain: string, service: string, serviceData: HAServiceCallData) {
    return {
        id: `quick-control-${Date.now()}`,
        function: {
            name: 'call_ha_service' as const,
            arguments: JSON.stringify({
                domain,
                service,
                service_data: serviceData,
            }),
        },
    };
}

export function createQuickControlPlan(
    text: string,
    entities: HassEntities,
    isHaConnected: boolean,
    hasCallService: boolean
): QuickControlPlan {
    const request = parseControlRequest(text);
    if (!request) return null;

    if (!isHaConnected || !hasCallService) {
        return { kind: 'fail', finalMessage: `${request.actionLabel}失败：Home Assistant 未连接` };
    }

    const target = resolveTarget(entities, request.targetText);
    if ('error' in target) {
        return { kind: 'fail', finalMessage: `${request.actionLabel}失败：${target.error}` };
    }

    const service = getServiceForAction(target.domain, request.action);
    if (!service) {
        return { kind: 'fail', finalMessage: `${request.actionLabel}失败：该设备不支持此操作` };
    }

    return {
        kind: 'execute',
        pendingMessage: `正在${request.actionLabel}${target.name}...`,
        actionLabel: request.actionLabel,
        displayName: target.name,
        toolCall: makeToolCall(target.domain, service, { entity_id: target.entityId }),
    };
}

function parseToolArguments(rawArguments: unknown): Record<string, unknown> {
    if (typeof rawArguments !== 'string') return {};
    try {
        const parsed = JSON.parse(rawArguments);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function getEntityIds(serviceData: unknown): string[] {
    if (!serviceData || typeof serviceData !== 'object' || Array.isArray(serviceData)) return [];
    const value = (serviceData as Record<string, unknown>).entity_id;
    if (typeof value === 'string') return [value];
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value;
    return [];
}

function getActionLabel(domain: string, service: string): string {
    if (service === 'turn_on') return domain === 'scene' || domain === 'script' ? '执行' : '打开';
    if (service === 'turn_off') return '关闭';
    if (service === 'open_cover') return '打开';
    if (service === 'close_cover') return '关闭';
    if (service === 'start') return '启动';
    if (service === 'return_to_base') return '回充';
    if (service === 'toggle') return '切换';
    return '操作';
}

function getToolResult(results: ToolCallResult[], toolCallId: string): ToolCallResult | undefined {
    return results.find(result => result.tool_call_id === toolCallId);
}

export function summarizeControlToolResults(
    entities: HassEntities,
    toolCalls: any[],
    results: ToolCallResult[]
): string | null {
    const lines: string[] = [];

    for (const toolCall of toolCalls) {
        if (toolCall.function?.name !== 'call_ha_service') continue;

        const args = parseToolArguments(toolCall.function.arguments);
        const domain = typeof args.domain === 'string' ? args.domain : '';
        const service = typeof args.service === 'string' ? args.service : '';
        const entityIds = getEntityIds(args.service_data);
        const names = entityIds.map(entityId => entities[entityId] ? getEntityName(entities[entityId]) : entityId);
        const actionLabel = getActionLabel(domain, service);
        const result = getToolResult(results, toolCall.id);
        const rawContent = result?.content || '';

        try {
            const payload = JSON.parse(rawContent);
            if (payload?.ok) {
                lines.push(`已${actionLabel}${names.join('、')}`);
                continue;
            }
        } catch {
            // 非 JSON 错误结果按文本处理。
        }

        const reason = rawContent.replace(/^操作执行失败[:：]\s*/, '').trim() || '未知原因';
        lines.push(`${actionLabel}失败：${reason}`);
    }

    return lines.length > 0 ? lines.join('\n') : null;
}

export async function executeQuickControlPlan(
    plan: QuickControlExecutePlan,
    entities: HassEntities,
    callService: AiCallService
): Promise<string> {
    const results = await withTimeout(
        executeHaTools(entities, [plan.toolCall], callService),
        QUICK_CONTROL_TIMEOUT_MS,
        'Home Assistant 响应超时'
    );
    return summarizeControlToolResults(entities, [plan.toolCall], results)
        || `${plan.actionLabel}失败：未收到执行结果`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}
