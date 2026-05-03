import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import {
  ArrowLeft,
  BrainCircuit,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  History,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  StickyNote,
  Wrench,
  X,
} from 'lucide-react';
import {
  agentKernelApi,
  setAgentKernelAuthToken,
  AgentConfigPayload,
  AgentModelProfile,
  AgentProposal,
  AgentStatus,
  AgentToolDefinition,
  AgentToolTrace,
  AgentChatMessage,
  AuditEntry,
  HeartbeatTask,
  MemoryEntry,
  WorkspaceDocMeta,
} from '@/services/agent-kernel-api';
import { sanitizeToken } from '@/utils/ha-connection';

type AgentTab = 'chat' | 'config' | 'proposals' | 'workspace' | 'memory' | 'heartbeats' | 'tools' | 'audit';

interface AgentConsoleProps {
  onClose: () => void;
  onDragStart?: (event: React.PointerEvent) => void;
  haToken?: string;
}

interface UiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  trace?: AgentToolTrace[];
}

const tabs: Array<{ key: AgentTab; label: string; icon: ComponentType<{ className?: string }> }> = [
  { key: 'chat', label: '对话', icon: MessageSquareText },
  { key: 'config', label: '模型', icon: Settings2 },
  { key: 'proposals', label: '提案', icon: ShieldCheck },
  { key: 'workspace', label: '文档', icon: FileText },
  { key: 'memory', label: '记忆', icon: StickyNote },
  { key: 'heartbeats', label: '心跳', icon: Clock3 },
  { key: 'tools', label: '工具', icon: Wrench },
  { key: 'audit', label: '审计', icon: History },
];

function emptyProfile(label: string): AgentModelProfile {
  return {
    label,
    base_url: '',
    api_key: '',
    model: '',
    enabled: true,
    timeout: 45,
  };
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function compactJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function createUiId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorText(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason || 'Agent 控制台加载失败');
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'pending'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : status === 'approved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'approved_not_applied'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : status === 'failed'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={classNames('rounded-full border px-2 py-0.5 text-[11px] font-medium', tone)}>{status}</span>;
}

function ProfileEditor({
  title,
  profile,
  optional,
  onChange,
  onRemove,
}: {
  title: string;
  profile: AgentModelProfile | null;
  optional?: boolean;
  onChange: (profile: AgentModelProfile) => void;
  onRemove?: () => void;
}) {
  if (!profile) {
    return (
      <section className="rounded-lg border border-dashed border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#1E293B]">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-500">未启用</p>
          </div>
          <button
            onClick={() => onChange(emptyProfile(title))}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-gray-50"
          >
            启用
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#1E293B]">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{profile.configured ? '已配置' : '未完整配置'}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={profile.enabled}
              onChange={(event) => onChange({ ...profile, enabled: event.target.checked })}
              className="h-3.5 w-3.5 accent-[#334155]"
            />
            启用
          </label>
          {optional && onRemove && (
            <button
              onClick={onRemove}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="移除"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-gray-500">名称</span>
          <input
            value={profile.label}
            onChange={(event) => onChange({ ...profile, label: event.target.value })}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-gray-500">Base URL</span>
          <input
            value={profile.base_url}
            onChange={(event) => onChange({ ...profile, base_url: event.target.value })}
            placeholder="https://api.example.com/v1"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_88px]">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-gray-500">模型</span>
            <input
              value={profile.model}
              onChange={(event) => onChange({ ...profile, model: event.target.value })}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-gray-500">超时</span>
            <input
              type="number"
              min={5}
              max={120}
              value={profile.timeout}
              onChange={(event) => onChange({ ...profile, timeout: Number(event.target.value) || 45 })}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
            />
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-gray-500">API Key</span>
          <input
            type="password"
            value={profile.api_key}
            onChange={(event) => onChange({ ...profile, api_key: event.target.value })}
            placeholder="保存脱敏值时会保留原 Key"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
          />
        </label>
      </div>
    </section>
  );
}

export default function AgentConsole({ onClose, onDragStart, haToken }: AgentConsoleProps) {
  const [activeTab, setActiveTab] = useState<AgentTab>('chat');
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [config, setConfig] = useState<AgentConfigPayload | null>(null);
  const [tools, setTools] = useState<AgentToolDefinition[]>([]);
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [workspaceDocs, setWorkspaceDocs] = useState<WorkspaceDocMeta[]>([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docSummary, setDocSummary] = useState('');
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [memoryQuery, setMemoryQuery] = useState('');
  const [newMemory, setNewMemory] = useState('');
  const [newMemoryTags, setNewMemoryTags] = useState('');
  const [heartbeats, setHeartbeats] = useState<HeartbeatTask[]>([]);
  const [heartbeatName, setHeartbeatName] = useState('');
  const [heartbeatPrompt, setHeartbeatPrompt] = useState('');
  const [heartbeatInterval, setHeartbeatInterval] = useState(60);
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(true);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<UiChatMessage[]>([
    {
      id: 'agent-welcome',
      role: 'assistant',
      content: 'Agent Kernel 已接入。你可以让我读取状态、创建提案、记录记忆或执行低风险控制。',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [includeTools, setIncludeTools] = useState(true);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const cleanHaToken = useMemo(() => sanitizeToken(haToken), [haToken]);
  const hasHaToken = cleanHaToken.length > 0;

  const pendingCount = useMemo(() => proposals.filter((proposal) => proposal.status === 'pending').length, [proposals]);
  const implementedToolCount = useMemo(() => tools.filter((tool) => tool.implemented).length, [tools]);

  useEffect(() => {
    setAgentKernelAuthToken(cleanHaToken);
  }, [cleanHaToken]);

  const loadAll = useCallback(async () => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [
        statusResult,
        configResult,
        toolsResult,
        proposalsResult,
        workspaceResult,
        memoryResult,
        heartbeatResult,
        auditResult,
      ] = await Promise.allSettled([
        agentKernelApi.status(),
        agentKernelApi.config(),
        agentKernelApi.tools(),
        agentKernelApi.proposals(),
        agentKernelApi.workspace(),
        agentKernelApi.memory(),
        agentKernelApi.heartbeats(),
        agentKernelApi.audit(),
      ]);

      if (statusResult.status === 'fulfilled') setStatus(statusResult.value);
      if (configResult.status === 'fulfilled') setConfig(configResult.value);
      if (toolsResult.status === 'fulfilled') setTools(toolsResult.value.tools || []);
      if (proposalsResult.status === 'fulfilled') setProposals(proposalsResult.value.proposals || []);
      if (workspaceResult.status === 'fulfilled') setWorkspaceDocs(workspaceResult.value.documents || []);
      if (memoryResult.status === 'fulfilled') setMemory(memoryResult.value.entries || []);
      if (heartbeatResult.status === 'fulfilled') setHeartbeats(heartbeatResult.value.heartbeats || []);
      if (auditResult.status === 'fulfilled') setAudit(auditResult.value.entries || []);

      const rejected = [
        statusResult,
        configResult,
        toolsResult,
        proposalsResult,
        workspaceResult,
        memoryResult,
        heartbeatResult,
        auditResult,
      ].find((result) => result.status === 'rejected');
      if (rejected?.status === 'rejected') {
        setError(getErrorText(rejected.reason));
      }
    } catch (err) {
      setError(getErrorText(err));
    } finally {
      setLoading(false);
    }
  }, [hasHaToken]);

  useEffect(() => {
    if (hasHaToken) {
      void loadAll();
    } else {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
    }
  }, [hasHaToken, loadAll]);

  const saveConfig = async () => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    if (!config) return;
    setLoading(true);
    setError('');
    try {
      const result = await agentKernelApi.saveConfig(config);
      setConfig(result.config);
      setNotice('模型配置已保存');
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '模型配置保存失败');
    } finally {
      setLoading(false);
    }
  };

  const sendAgentTurn = async () => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    const text = chatInput.trim();
    if (!text || loading) return;
    const userMessage: UiChatMessage = { id: createUiId('agent-user'), role: 'user', content: text };
    const nextMessages = [...chatMessages, userMessage];
    setChatMessages(nextMessages);
    setChatInput('');
    setLoading(true);
    setError('');
    try {
      const apiMessages: AgentChatMessage[] = nextMessages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-12)
        .map((message) => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          content: message.content,
        }));
      const response = await agentKernelApi.turn(apiMessages, includeTools);
      setChatMessages((prev) => [
        ...prev,
        {
          id: createUiId('agent-ai'),
          role: 'assistant',
          content: response.content || '已完成，但模型没有返回正文。',
          source: response.source,
          trace: response.metadata.tool_trace || [],
        },
      ]);
      await Promise.allSettled([
        agentKernelApi.proposals().then((result) => setProposals(result.proposals)),
        agentKernelApi.audit().then((result) => setAudit(result.entries)),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent 对话失败';
      setChatMessages((prev) => [...prev, { id: createUiId('agent-error'), role: 'assistant', content: `出错了：${message}` }]);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const approveProposal = async (proposalId: string) => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    setBusyId(proposalId);
    setError('');
    try {
      await agentKernelApi.approveProposal(proposalId);
      setNotice('提案已处理');
      const [proposalResult, auditResult] = await Promise.all([agentKernelApi.proposals(), agentKernelApi.audit()]);
      setProposals(proposalResult.proposals);
      setAudit(auditResult.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提案处理失败');
    } finally {
      setBusyId('');
    }
  };

  const discardProposal = async (proposalId: string) => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    setBusyId(proposalId);
    setError('');
    try {
      await agentKernelApi.discardProposal(proposalId);
      setNotice('提案已丢弃');
      const [proposalResult, auditResult] = await Promise.all([agentKernelApi.proposals(), agentKernelApi.audit()]);
      setProposals(proposalResult.proposals);
      setAudit(auditResult.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提案处理失败');
    } finally {
      setBusyId('');
    }
  };

  const loadWorkspaceDoc = async (name: string) => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    setSelectedDoc(name);
    setError('');
    try {
      const doc = await agentKernelApi.workspaceDoc(name);
      setDocContent(doc.content);
      setDocSummary('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档读取失败');
    }
  };

  const proposeWorkspaceUpdate = async () => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    if (!selectedDoc) return;
    setLoading(true);
    setError('');
    try {
      await agentKernelApi.proposeWorkspace(selectedDoc, docContent, docSummary || `Update ${selectedDoc}`);
      setNotice('文档变更提案已创建');
      const proposalResult = await agentKernelApi.proposals();
      setProposals(proposalResult.proposals);
      setActiveTab('proposals');
    } catch (err) {
      setError(err instanceof Error ? err.message : '文档提案创建失败');
    } finally {
      setLoading(false);
    }
  };

  const refreshMemory = async () => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    const result = await agentKernelApi.memory(memoryQuery.trim() || undefined);
    setMemory(result.entries);
  };

  const addMemory = async () => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    if (!newMemory.trim()) return;
    setLoading(true);
    setError('');
    try {
      const tags = newMemoryTags.split(',').map((tag) => tag.trim()).filter(Boolean);
      await agentKernelApi.addMemory(newMemory, tags);
      setNewMemory('');
      setNewMemoryTags('');
      await refreshMemory();
      setNotice('记忆已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '记忆保存失败');
    } finally {
      setLoading(false);
    }
  };

  const createHeartbeat = async () => {
    if (!hasHaToken) {
      setError('缺少 Home Assistant Token：请先在设置中保存有效的长期访问令牌');
      return;
    }
    if (!heartbeatName.trim() || !heartbeatPrompt.trim()) return;
    setLoading(true);
    setError('');
    try {
      await agentKernelApi.createHeartbeat({
        name: heartbeatName,
        prompt: heartbeatPrompt,
        interval_minutes: heartbeatInterval,
        enabled: heartbeatEnabled,
      });
      setHeartbeatName('');
      setHeartbeatPrompt('');
      setHeartbeatInterval(60);
      const heartbeatResult = await agentKernelApi.heartbeats();
      setHeartbeats(heartbeatResult.heartbeats);
      setNotice('心跳任务已创建');
    } catch (err) {
      setError(err instanceof Error ? err.message : '心跳创建失败');
    } finally {
      setLoading(false);
    }
  };

  const renderChat = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chatMessages.map((message) => (
          <div key={message.id} className={classNames('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={classNames(
              'max-w-[86%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm',
              message.role === 'user' ? 'bg-[#334155] text-white' : 'border border-gray-200 bg-white text-[#1E293B]',
            )}>
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{message.content}</ReactMarkdown>
              {message.source && <div className="mt-2 text-[11px] text-gray-400">来源：{message.source}</div>}
              {message.trace && message.trace.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {message.trace.map((trace) => (
                    <span
                      key={`${trace.tool_call_id}-${trace.name}`}
                      className={classNames(
                        'rounded-full border px-2 py-0.5 text-[10px]',
                        trace.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700',
                      )}
                    >
                      {trace.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={includeTools}
              onChange={(event) => setIncludeTools(event.target.checked)}
              className="h-3.5 w-3.5 accent-[#334155]"
            />
            使用 Agent 工具
          </label>
          <button onClick={() => setChatMessages([])} className="text-xs text-gray-400 hover:text-red-500">清空</button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendAgentTurn();
              }
            }}
            rows={2}
            placeholder="让 Agent 检查状态、创建提案或记录记忆..."
            className="min-h-[46px] flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#334155]"
          />
          <button
            onClick={() => void sendAgentTurn()}
            disabled={loading || !hasHaToken || !chatInput.trim()}
            className="mb-0.5 rounded-lg bg-[#334155] p-2.5 text-white disabled:opacity-50"
            title="发送"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  const renderConfig = () => (
    <div className="space-y-3 p-4">
      {!config ? (
        <PanelState
          loading={loading}
          title="模型配置不可用"
          text={error || '正在读取 Agent 模型配置，请确认 HAUI 自定义集成已加载。'}
          onRetry={loadAll}
        />
      ) : (
        <>
          <ProfileEditor
            title="Primary AI"
            profile={config.primary}
            onChange={(profile) => setConfig({ ...config, primary: profile })}
          />
          <ProfileEditor
            title="Backup AI"
            profile={config.backup}
            optional
            onChange={(profile) => setConfig({ ...config, backup: profile })}
            onRemove={() => setConfig({ ...config, backup: null })}
          />
          <ProfileEditor
            title="Summary AI"
            profile={config.summary}
            optional
            onChange={(profile) => setConfig({ ...config, summary: profile })}
            onRemove={() => setConfig({ ...config, summary: null, summary_enabled: false })}
          />
          <section className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-[#1E293B]">
                <input
                  type="checkbox"
                  checked={config.summary_enabled}
                  onChange={(event) => setConfig({ ...config, summary_enabled: event.target.checked })}
                  className="h-4 w-4 accent-[#334155]"
                />
                启用总结通道
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-gray-500">最大循环步数</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={config.max_turn_steps}
                  onChange={(event) => setConfig({ ...config, max_turn_steps: Number(event.target.value) || 6 })}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
                />
              </label>
            </div>
          </section>
          <button
            onClick={() => void saveConfig()}
            disabled={loading || !hasHaToken}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#334155] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存 Agent 配置
          </button>
        </>
      )}
    </div>
  );

  const renderProposals = () => (
    <div className="space-y-3 p-4">
      {proposals.map((proposal) => (
        <section key={proposal.id} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-[#1E293B]">{proposal.title}</h3>
                <StatusPill status={proposal.status} />
              </div>
              <p className="mt-1 text-xs text-gray-500">{proposal.summary || proposal.type}</p>
              <p className="mt-1 text-[11px] text-gray-400">{formatTime(proposal.created_at)}</p>
            </div>
            {proposal.status === 'pending' && (
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => void approveProposal(proposal.id)}
                  disabled={busyId === proposal.id}
                  className="rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  批准
                </button>
                <button
                  onClick={() => void discardProposal(proposal.id)}
                  disabled={busyId === proposal.id}
                  className="rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  丢弃
                </button>
              </div>
            )}
          </div>
          <pre className="mt-3 max-h-32 overflow-auto rounded-md bg-gray-50 p-2 text-[11px] text-gray-600">{compactJson(proposal.payload)}</pre>
        </section>
      ))}
      {proposals.length === 0 && <EmptyState text="暂无提案" />}
    </div>
  );

  const renderWorkspace = () => (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[170px_1fr]">
      <div className="border-b border-gray-100 p-3 md:border-b-0 md:border-r">
        <div className="space-y-1">
          {workspaceDocs.map((doc) => (
            <button
              key={doc.name}
              onClick={() => void loadWorkspaceDoc(doc.name)}
              className={classNames(
                'w-full rounded-md px-2 py-2 text-left text-xs font-medium',
                selectedDoc === doc.name ? 'bg-[#334155] text-white' : 'text-gray-600 hover:bg-gray-50',
              )}
            >
              {doc.name}
            </button>
          ))}
          {workspaceDocs.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-gray-400">暂无文档</p>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-col p-3">
        <input
          value={docSummary}
          onChange={(event) => setDocSummary(event.target.value)}
          placeholder="变更摘要"
          className="mb-2 rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
        />
        <textarea
          value={docContent}
          onChange={(event) => setDocContent(event.target.value)}
          placeholder="选择左侧文档"
          className="min-h-[280px] flex-1 resize-none rounded-lg border border-gray-200 p-3 font-mono text-xs leading-relaxed outline-none focus:border-[#334155]"
        />
        <button
          onClick={() => void proposeWorkspaceUpdate()}
          disabled={!selectedDoc || loading}
          className="mt-2 rounded-lg bg-[#334155] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          生成文档提案
        </button>
      </div>
    </div>
  );

  const renderMemory = () => (
    <div className="space-y-3 p-4">
      <section className="rounded-lg border border-gray-200 bg-white p-3">
        <textarea
          value={newMemory}
          onChange={(event) => setNewMemory(event.target.value)}
          rows={3}
          placeholder="新增长期记忆"
          className="w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#334155]"
        />
        <div className="mt-2 flex gap-2">
          <input
            value={newMemoryTags}
            onChange={(event) => setNewMemoryTags(event.target.value)}
            placeholder="标签，用逗号分隔"
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
          />
          <button onClick={() => void addMemory()} className="rounded-md bg-[#334155] px-3 py-2 text-xs font-medium text-white">保存</button>
        </div>
      </section>
      <div className="flex gap-2">
        <input
          value={memoryQuery}
          onChange={(event) => setMemoryQuery(event.target.value)}
          placeholder="搜索记忆"
          className="min-w-0 flex-1 rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
        />
        <button onClick={() => void refreshMemory()} className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">搜索</button>
      </div>
      {memory.map((entry) => (
        <section key={entry.id} className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-sm text-[#1E293B]">{entry.text}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.tags.map((tag) => <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{tag}</span>)}
          </div>
          <p className="mt-2 text-[11px] text-gray-400">{entry.source} · {formatTime(entry.created_at)}</p>
        </section>
      ))}
    </div>
  );

  const renderHeartbeats = () => (
    <div className="space-y-3 p-4">
      <section className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px]">
          <input
            value={heartbeatName}
            onChange={(event) => setHeartbeatName(event.target.value)}
            placeholder="任务名称"
            className="rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
          />
          <input
            type="number"
            value={heartbeatInterval}
            min={1}
            max={1440}
            onChange={(event) => setHeartbeatInterval(Number(event.target.value) || 60)}
            className="rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-[#334155]"
          />
        </div>
        <textarea
          value={heartbeatPrompt}
          onChange={(event) => setHeartbeatPrompt(event.target.value)}
          rows={3}
          placeholder="心跳任务内容"
          className="mt-2 w-full resize-none rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#334155]"
        />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={heartbeatEnabled} onChange={(event) => setHeartbeatEnabled(event.target.checked)} className="h-3.5 w-3.5 accent-[#334155]" />
            启用
          </label>
          <button onClick={() => void createHeartbeat()} className="rounded-md bg-[#334155] px-3 py-2 text-xs font-medium text-white">创建</button>
        </div>
      </section>
      {heartbeats.map((task) => (
        <section key={task.id} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#1E293B]">{task.name}</h3>
            <span className={classNames('rounded-full px-2 py-0.5 text-[10px]', task.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
              {task.enabled ? 'enabled' : 'disabled'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">{task.prompt}</p>
          <p className="mt-2 text-[11px] text-gray-400">{task.interval_minutes} 分钟 · {formatTime(task.created_at)}</p>
        </section>
      ))}
    </div>
  );

  const renderTools = () => (
    <div className="space-y-3 p-4">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="阶段" value={status ? String(status.stage) : '-'} />
        <Metric label="工具" value={`${implementedToolCount}/${tools.length || status?.tool_count || 0}`} />
        <Metric label="提案" value={String(pendingCount)} />
        <Metric label="模型" value={status?.config?.primary?.configured ? 'ready' : 'empty'} />
      </section>
      <div className="space-y-2">
        {tools.map((tool) => (
          <section key={tool.name} className="rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 truncate font-mono text-xs font-semibold text-[#1E293B]">{tool.name}</h3>
              <span className={classNames('rounded-full px-2 py-0.5 text-[10px]', tool.implemented ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                {tool.policy_level}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{tool.description}</p>
          </section>
        ))}
      </div>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-2 p-4">
      {audit.map((entry) => (
        <section key={entry.id} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-xs font-semibold text-[#1E293B]">{entry.action}</h3>
            <span className="text-[11px] text-gray-400">{formatTime(entry.time)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">{entry.actor}</p>
          <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-gray-50 p-2 text-[11px] text-gray-600">{compactJson(entry.result)}</pre>
        </section>
      ))}
      {audit.length === 0 && <EmptyState text="暂无审计记录" />}
    </div>
  );

  const renderActiveTab = () => {
    if (activeTab === 'chat') return renderChat();
    if (activeTab === 'config') return renderConfig();
    if (activeTab === 'proposals') return renderProposals();
    if (activeTab === 'workspace') return renderWorkspace();
    if (activeTab === 'memory') return renderMemory();
    if (activeTab === 'heartbeats') return renderHeartbeats();
    if (activeTab === 'tools') return renderTools();
    return renderAudit();
  };

  return (
    <div className="flex h-full w-full flex-col bg-white text-[#1E293B]">
      <div
        className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4"
        onPointerDown={onDragStart}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-[#334155]"
            title="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#334155] text-white">
            <BrainCircuit className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-tight">Agent 控制台</h2>
            <p className="truncate text-[10px] text-gray-500">{status?.kernel || 'HAUI Agent Kernel'}</p>
          </div>
        </div>
        <button
          onClick={() => void loadAll()}
          onPointerDown={(event) => event.stopPropagation()}
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#334155]"
          title="刷新"
          disabled={!hasHaToken}
        >
          <RefreshCw className={classNames('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="border-b border-gray-100 bg-[#F8FAFC] px-3 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={classNames(
                  'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  activeTab === tab.key ? 'bg-white text-[#1E293B] shadow-sm' : 'text-gray-500 hover:bg-white/70 hover:text-[#334155]',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.key === 'proposals' && pendingCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-700">{pendingCount}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {(error || notice) && (
        <div className={classNames('flex items-center gap-2 border-b px-4 py-2 text-xs', error ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700')}>
          {error ? <CircleAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          <span className="min-w-0 flex-1 truncate">{error || notice}</span>
          <button onClick={() => { setError(''); setNotice(''); }} className="rounded p-0.5 hover:bg-white/60">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#F8FAFC]">
        {renderActiveTab()}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-[#1E293B]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-sm text-gray-400">
      {text}
    </div>
  );
}

function PanelState({
  loading,
  title,
  text,
  onRetry,
}: {
  loading: boolean;
  title: string;
  text: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-5 text-center">
      {loading ? <Loader2 className="mb-3 h-5 w-5 animate-spin text-[#334155]" /> : <CircleAlert className="mb-3 h-5 w-5 text-amber-500" />}
      <h3 className="text-sm font-semibold text-[#1E293B]">{loading ? '正在加载' : title}</h3>
      <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-gray-500">{text}</p>
      {!loading && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-md bg-[#334155] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          重新加载
        </button>
      )}
    </div>
  );
}
