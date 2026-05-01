import { z } from 'zod';

// =====================================================================
// AI 服务商配置（仅包含公开信息，无敏感数据）
// =====================================================================
export const AI_PROVIDER_KEYS = ['siliconflow', 'alibaba', 'deepseek', 'custom'] as const;
export type AiProviderType = typeof AI_PROVIDER_KEYS[number];

export interface AiModelOption {
  label: string;
  value: string;
  supportsTools?: boolean;
}

export interface AiProviderInfo {
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: AiModelOption[];
  apiKeyUrl?: string;
  apiKeyPlaceholder: string;
  supportsTools: boolean;
}

export const AI_PROVIDERS: Record<AiProviderType, AiProviderInfo> = {
  // 1. 硅基流动 (推荐：免费且模型多)
  // Key 申请地址: https://cloud.siliconflow.cn/account/ak
  siliconflow: {
    label: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
    apiKeyUrl: 'https://cloud.siliconflow.cn/account/ak',
    apiKeyPlaceholder: 'sk-...',
    supportsTools: true,
    // 常用模型列表，供用户下拉选择
    models: [
      { label: 'DeepSeek V3 (推荐)', value: 'deepseek-ai/DeepSeek-V3' },
      { label: 'DeepSeek R1 (强推理)', value: 'deepseek-ai/DeepSeek-R1' },
      { label: 'Qwen 2.5 7B (极速)', value: 'Qwen/Qwen2.5-7B-Instruct' },
      { label: 'Qwen 2.5 72B (均衡)', value: 'Qwen/Qwen2.5-72B-Instruct' }
    ]
  },
  // 2. 阿里云百炼 (稳定)
  // Key 申请地址: https://bailian.console.aliyun.com/
  alibaba: {
    label: '阿里云百炼 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    apiKeyUrl: 'https://bailian.console.aliyun.com/',
    apiKeyPlaceholder: '请输入百炼平台 API Key',
    supportsTools: true,
    models: [
      { label: '通义千问 Plus (推荐｜工具调用)', value: 'qwen-plus' },
      { label: '通义千问 Max (强能力｜工具调用)', value: 'qwen-max' },
      { label: '通义千问 Flash (低延迟)', value: 'qwen-flash' },
      { label: 'Qwen 3.5 Plus (新一代)', value: 'qwen3.5-plus' },
      { label: 'Qwen 3.5 Flash (低成本)', value: 'qwen3.5-flash' },
      { label: 'Qwen 3 Max', value: 'qwen3-max' }
    ]
  },
  // 3. DeepSeek 官方 API
  // Key 申请地址: https://platform.deepseek.com/api_keys
  deepseek: {
    label: 'DeepSeek 官方 API',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    apiKeyPlaceholder: 'sk-...',
    supportsTools: true,
    models: [
      { label: 'DeepSeek Chat (推荐｜工具调用)', value: 'deepseek-chat' },
      { label: 'DeepSeek Reasoner (推理｜不支持控制)', value: 'deepseek-reasoner', supportsTools: false }
    ]
  },
  // 4. 自定义 (兼容所有 OpenAI 格式接口)
  custom: {
    label: '自定义 (OpenAI Compatible)',
    baseUrl: '',
    defaultModel: '',
    apiKeyPlaceholder: '请输入 API Key',
    supportsTools: true,
    models: [] // 自定义模式下由用户手动输入模型名
  }
};

export interface AiConfig {
  provider: AiProviderType;
  apiKey: string;
  baseUrl?: string;
  modelName: string;
}

// =====================================================================
// 安全修复 #1: Zod Schema 验证，确保 localStorage 读回的配置合法
// 防止被篡改的数据注入非法字段或格式
// =====================================================================
export const AiConfigSchema = z.object({
  provider: z.enum(AI_PROVIDER_KEYS),
  // API Key 只允许 ASCII 可打印字符，防止 Unicode 注入
  apiKey: z.string().regex(/^[\x20-\x7E]*$/, 'API Key 包含非法字符').max(512),
  // baseUrl 如果存在则必须是合法 URL
  baseUrl: z.string().url('无效的 Base URL').optional().or(z.literal('')),
  modelName: z.string().max(256),
});

export const DEFAULT_CONFIG: AiConfig = {
  provider: 'alibaba',
  apiKey: '',
  baseUrl: AI_PROVIDERS.alibaba.baseUrl,
  modelName: AI_PROVIDERS.alibaba.defaultModel,
};

export function getAiProviderInfo(provider: AiProviderType): AiProviderInfo {
  return AI_PROVIDERS[provider] || AI_PROVIDERS.custom;
}

export function providerSupportsToolCalling(config: Pick<AiConfig, 'provider' | 'modelName'>): boolean {
  const provider = getAiProviderInfo(config.provider);
  const model = provider.models.find(item => item.value === config.modelName);
  return model?.supportsTools ?? provider.supportsTools;
}

// =====================================================================
// 安全修复 #2: API Key 脱敏工具函数
// 用于日志输出时隐藏完整 Key，只显示前 6 位
// =====================================================================
function maskApiKey(key: string): string {
  if (key.length <= 6) return '***';
  return `${key.slice(0, 6)}...***`;
}

// 通用 OpenAI 兼容请求函数
export async function fetchOpenAICompatible(
  userMessage: string,
  systemContext: string,
  config: AiConfig
): Promise<string> {
  const { apiKey, baseUrl, modelName } = config;

  if (!apiKey) throw new Error('API Key is missing');
  if (!baseUrl) throw new Error('Base URL is missing');
  if (!modelName) throw new Error('Model name is missing');

  // 移除末尾斜杠
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const url = `${cleanBaseUrl}/chat/completions`;

  // 安全修复 #3: 确保 API Key 只包含 ASCII 字符，防止 Unicode 字符编码绕过
   
  const safeApiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${safeApiKey}`
  };

  const body = {
    model: modelName,
    messages: [
      { role: 'system', content: systemContext },
      { role: 'user', content: userMessage }
    ],
    stream: false
  };

  try {
    // 30 秒超时保护，防止网络异常时请求永久挂起
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // 安全修复 #4: 错误提示不向用户暴露 API Key，
      // 开发者日志使用脱敏版本
      if (import.meta.env.DEV) {
        console.error('[AI Service] API 错误:', response.status, errorData);
      }

      // 百炼 DashScope 特有错误码识别（兼容模式返回 error.code / error.message）
      const dashScopeCode = errorData?.error?.code || errorData?.code || '';
      const dashScopeMsg = errorData?.error?.message || errorData?.message || '';

      if (dashScopeCode === 'InvalidApiKey' || response.status === 401) {
        if (import.meta.env.DEV) {
          console.warn('[AI Service] 鉴权失败, key:', maskApiKey(safeApiKey));
        }
        throw new Error('API Key 无效，请在百炼控制台检查或确认 Key 是否正确 (401)');
      }
      if (dashScopeCode === 'Throttling' || response.status === 429) {
        throw new Error('请求过于频繁，请稍后重试');
      }
      if (dashScopeCode === 'ModelNotFound') {
        throw new Error('模型不可用，请选择其他模型');
      }
      if (response.status === 404) {
        throw new Error('接口未找到：请检查 Base URL 或模型名称 (404)');
      }
      // 如果百炼返回了有意义的错误消息，优先展示
      if (dashScopeMsg) {
        throw new Error(`AI 请求失败: ${dashScopeMsg}`);
      }
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'AI 未返回内容';
  } catch (error: unknown) {
    // 安全修复 #6: 捕获网络错误时不向用户暴露内部细节
    if (error instanceof Error) {
      if (import.meta.env.DEV) {
        console.error('[AI Service] fetchOpenAICompatible Error:', error.message);
      }
      // 超时中断
      if (error.name === 'AbortError') {
        throw new Error('AI 请求超时（30秒），请检查网络连接后重试');
      }
      // 网络错误 (TypeError usually indicates network issue in fetch)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('网络请求失败：请检查网络连接或 Base URL 是否可访问');
      }
      throw error;
    }
    throw new Error('未知错误，请重试');
  }
}

export class AiService {
  private config: AiConfig;

  constructor(config: AiConfig) {
    this.config = config;
  }

  updateConfig(config: AiConfig) {
    this.config = config;
  }

  async chat(userMessage: string, contextData: string): Promise<string> {
    const systemPrompt = `
你是 HAUI 系统内置的 AI 助手。
你拥有读取当前家庭设备状态的权限。

【当前设备状态快照】：
${contextData}

【你的任务】：
1. 根据用户的问题，结合上述设备状态进行回答。
2. 如果用户询问状态，请准确播报。
3. 如果用户询问"有什么自动化建议"，请分析当前设备列表，发挥想象力，提供 1-2 个实用的自动化思路，并附带简单的 Home Assistant Automation YAML 代码示例。
4. 回答要简练、亲切。如果设备状态是 on/off，请转化为自然语言（开启/关闭）。
`;

    try {
      // 使用通用的 fetchOpenAICompatible 函数
      return await fetchOpenAICompatible(userMessage, systemPrompt, this.config);
    } catch (error: unknown) {
      // 安全修复 #7: 仅在 DEV 模式记录完整错误，生产对用户只返回友好提示
      if (import.meta.env.DEV && error instanceof Error) {
        console.error('[AiService] chat error:', error.message);
      }
      const message = error instanceof Error ? error.message : 'AI Service Request Failed';
      throw new Error(message);
    }
  }
}

export const aiService = new AiService(DEFAULT_CONFIG);
