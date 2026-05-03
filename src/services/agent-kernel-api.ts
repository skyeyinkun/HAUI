import { sanitizeToken } from '@/utils/ha-connection';
import { getApiUrl } from '@/utils/sync';

const AGENT_PROXY_PREFIX = '/ha-api';
const REQUEST_TIMEOUT_MS = 10000;

export interface AgentModelProfile {
  label: string;
  base_url: string;
  api_key: string;
  model: string;
  enabled: boolean;
  timeout: number;
  configured?: boolean;
}

export interface AgentConfigPayload {
  primary: AgentModelProfile;
  backup: AgentModelProfile | null;
  summary: AgentModelProfile | null;
  summary_enabled: boolean;
  max_turn_steps: number;
}

export interface AgentStatus {
  ok: boolean;
  stage: number;
  stages_enabled: number[];
  kernel: string;
  config: AgentConfigPayload;
  tool_count: number;
  implemented_tool_count: number;
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  policy_level: string;
  implemented: boolean;
  parameters: Record<string, unknown>;
}

export interface AgentAttempt {
  role: string;
  label: string;
  ok: boolean;
  error?: string | null;
}

export interface AgentToolTrace {
  name: string;
  ok: boolean;
  tool_call_id: string;
  error?: string;
}

export interface AgentTurnResponse {
  ok: boolean;
  content: string;
  source: string;
  attempts: AgentAttempt[];
  metadata: {
    model?: string;
    finish_reason?: string | null;
    tool_trace?: AgentToolTrace[];
    tool_calls?: unknown[];
  };
}

export interface AgentProposal {
  id: string;
  type: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  result: unknown;
}

export interface WorkspaceDocMeta {
  name: string;
  length: number;
  signature: string;
}

export interface WorkspaceDoc {
  name: string;
  content: string;
  signature: string;
}

export interface MemoryEntry {
  id: string;
  text: string;
  tags: string[];
  source: string;
  created_at: string;
}

export interface HeartbeatTask {
  id: string;
  name: string;
  prompt: string;
  interval_minutes: number;
  enabled: boolean;
  created_at: string;
  last_run_at: string | null;
}

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface AgentChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

let agentAuthToken = '';

export function setAgentKernelAuthToken(token?: string | null): void {
  agentAuthToken = sanitizeToken(token);
}

type AgentApiRoute = 'ha-core' | 'ha-api-proxy';

interface AgentApiTarget {
  route: AgentApiRoute;
  url: string;
}

class AgentApiError extends Error {
  status?: number;
  route?: AgentApiRoute;

  constructor(message: string, status?: number, route?: AgentApiRoute) {
    super(message);
    this.name = 'AgentApiError';
    this.status = status;
    this.route = route;
  }
}

function isIngressPage(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.includes('hassio_ingress');
}

function getAgentApiTargets(endpoint: string): AgentApiTarget[] {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const proxyTarget = {
    route: 'ha-api-proxy' as const,
    url: getApiUrl(`${AGENT_PROXY_PREFIX}${cleanEndpoint}`),
  };

  if (!isIngressPage() || typeof window === 'undefined') {
    return [proxyTarget];
  }

  return [
    {
      route: 'ha-core',
      url: `${window.location.origin}${cleanEndpoint}`,
    },
    proxyTarget,
  ];
}

function getPayloadError(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    return String((payload as { error?: unknown }).error);
  }
  return null;
}

function getStatusError(status: number, payload: unknown, text: string, route: AgentApiRoute): AgentApiError {
  const payloadError = getPayloadError(payload);
  if (status === 401) {
    return new AgentApiError(
      payloadError || `Agent API 未授权 (401)：Home Assistant 没有收到有效访问令牌，通道 ${route}`,
      status,
      route,
    );
  }
  if (status === 403) {
    return new AgentApiError(
      payloadError || `Agent API 权限不足 (403)：请使用 Home Assistant 管理员账号的长期访问令牌，通道 ${route}`,
      status,
      route,
    );
  }
  const snippet = text.replace(/\s+/g, ' ').slice(0, 80);
  return new AgentApiError(payloadError || `Agent API 请求失败 (${status})：${snippet || route}`, status, route);
}

function mergeHeaders(route: AgentApiRoute, optionsHeaders?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const applyHeader = (key: string, value: string) => {
    headers[key] = value;
  };

  if (optionsHeaders instanceof Headers) {
    optionsHeaders.forEach((value, key) => applyHeader(key, value));
  } else if (Array.isArray(optionsHeaders)) {
    optionsHeaders.forEach(([key, value]) => applyHeader(key, value));
  } else if (optionsHeaders) {
    Object.entries(optionsHeaders).forEach(([key, value]) => {
      if (typeof value === 'string') applyHeader(key, value);
    });
  }

  if (agentAuthToken) {
    const authorization = `Bearer ${agentAuthToken}`;
    headers.Authorization = authorization;
    if (route === 'ha-api-proxy') {
      headers['X-HA-Authorization'] = authorization;
    }
  }

  return headers;
}

async function fetchJsonFromTarget<T>(
  target: AgentApiTarget,
  options: RequestInit,
  signal: AbortSignal,
): Promise<T> {
  const headers = mergeHeaders(target.route, options.headers);
  const response = await fetch(target.url, {
    credentials: 'include',
    ...options,
    signal,
    headers,
  });
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw getStatusError(response.status, null, text, target.route);
      }
      const snippet = text.replace(/\s+/g, ' ').slice(0, 80);
      throw new AgentApiError(`Agent API 返回了非 JSON 内容：${snippet || response.status}`, response.status, target.route);
    }
  }

  if (!response.ok) {
    throw getStatusError(response.status, payload, text, target.route);
  }
  if (payload === null || typeof payload !== 'object') {
    throw new AgentApiError('Agent API 返回内容为空或格式不正确', response.status, target.route);
  }
  return payload as T;
}

async function requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!agentAuthToken) {
    throw new AgentApiError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
  }
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const targets = getAgentApiTargets(endpoint);
  let lastError: unknown = null;

  try {
    for (const target of targets) {
      try {
        return await fetchJsonFromTarget<T>(target, options, controller.signal);
      } catch (error) {
        lastError = error;
        const canRetryProxy = target.route === 'ha-core'
          && error instanceof AgentApiError
          && [401, 403, 404].includes(error.status || 0);
        if (!canRetryProxy) {
          throw error;
        }
      }
    }

    throw lastError || new AgentApiError('Agent API 请求失败');
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Agent API 请求超时，请确认 HAUI 自定义集成已加载');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const agentKernelApi = {
  status: () => requestJson<AgentStatus>('/api/yinkun_ui/agent/status'),
  tools: () => requestJson<{ tools: AgentToolDefinition[] }>('/api/yinkun_ui/agent/tools'),
  config: () => requestJson<AgentConfigPayload>('/api/yinkun_ui/agent/config'),
  saveConfig: (config: AgentConfigPayload) => requestJson<{ ok: boolean; config: AgentConfigPayload }>(
    '/api/yinkun_ui/agent/config',
    { method: 'POST', body: JSON.stringify(config) },
  ),
  turn: (messages: AgentChatMessage[], includeTools: boolean) => requestJson<AgentTurnResponse>(
    '/api/yinkun_ui/agent/turn',
    { method: 'POST', body: JSON.stringify({ messages, include_tools: includeTools }) },
  ),
  proposals: (status?: string) => requestJson<{ proposals: AgentProposal[] }>(
    status ? `/api/yinkun_ui/agent/proposals?status=${encodeURIComponent(status)}` : '/api/yinkun_ui/agent/proposals',
  ),
  approveProposal: (proposalId: string) => requestJson<{ ok: boolean; proposal: AgentProposal }>(
    `/api/yinkun_ui/agent/proposals/${encodeURIComponent(proposalId)}/approve`,
    { method: 'POST', body: JSON.stringify({}) },
  ),
  discardProposal: (proposalId: string) => requestJson<{ ok: boolean; proposal: AgentProposal }>(
    `/api/yinkun_ui/agent/proposals/${encodeURIComponent(proposalId)}/discard`,
    { method: 'POST', body: JSON.stringify({}) },
  ),
  workspace: () => requestJson<{ documents: WorkspaceDocMeta[] }>('/api/yinkun_ui/agent/workspace'),
  workspaceDoc: (name: string) => requestJson<WorkspaceDoc>(
    `/api/yinkun_ui/agent/workspace/${encodeURIComponent(name)}`,
  ),
  proposeWorkspace: (name: string, content: string, summary: string) => requestJson<{ ok: boolean; proposal: AgentProposal }>(
    '/api/yinkun_ui/agent/workspace/propose',
    { method: 'POST', body: JSON.stringify({ name, content, summary }) },
  ),
  memory: (query?: string) => requestJson<{ entries: MemoryEntry[] }>(
    query ? `/api/yinkun_ui/agent/memory?query=${encodeURIComponent(query)}` : '/api/yinkun_ui/agent/memory',
  ),
  addMemory: (text: string, tags: string[]) => requestJson<{ ok: boolean; entry: MemoryEntry }>(
    '/api/yinkun_ui/agent/memory',
    { method: 'POST', body: JSON.stringify({ text, tags }) },
  ),
  heartbeats: () => requestJson<{ heartbeats: HeartbeatTask[] }>('/api/yinkun_ui/agent/heartbeats'),
  createHeartbeat: (payload: Pick<HeartbeatTask, 'name' | 'prompt' | 'interval_minutes' | 'enabled'>) =>
    requestJson<{ ok: boolean; heartbeat: HeartbeatTask }>(
      '/api/yinkun_ui/agent/heartbeats',
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  audit: () => requestJson<{ entries: AuditEntry[] }>('/api/yinkun_ui/agent/audit?limit=100'),
};
