import { getApiUrl } from '@/utils/sync';

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

async function requestJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(getApiUrl(endpoint), {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error)
      : `请求失败 (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
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
