import { z } from 'zod';

// =====================================================================
// AI 服务商配置（仅包含公开信息，无敏感数据）
// =====================================================================
export const AI_PROVIDERS = {
  // 1. 硅基流动 (推荐：免费且模型多)
  // Key 申请地址: https://cloud.siliconflow.cn/account/ak
  siliconflow: {
    label: '硅基流动 (SiliconFlow)',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3',
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
    models: [
      { label: '通义千问 Plus (均衡)', value: 'qwen-plus' },
      { label: '通义千问 Max (最强)', value: 'qwen-max' },
      { label: '通义千问 Turbo (极速)', value: 'qwen-turbo' }
    ]
  },
  // 3. 自定义 (兼容所有 OpenAI 格式接口)
  custom: {
    label: '自定义 (OpenAI Compatible)',
    baseUrl: '',
    defaultModel: '',
    models: [] // 自定义模式下由用户手动输入模型名
  }
};

export type AiProviderType = keyof typeof AI_PROVIDERS;

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
  provider: z.enum(['siliconflow', 'alibaba', 'custom']),
  // API Key 只允许 ASCII 可打印字符，防止 Unicode 注入
  apiKey: z.string().regex(/^[\x20-\x7E]*$/, 'API Key 包含非法字符').max(512),
  // baseUrl 如果存在则必须是合法 URL
  baseUrl: z.string().url('无效的 Base URL').optional().or(z.literal('')),
  modelName: z.string().max(256),
});

export const DEFAULT_CONFIG: AiConfig = {
  provider: 'siliconflow',
  apiKey: '',
  baseUrl: AI_PROVIDERS.siliconflow.baseUrl,
  modelName: AI_PROVIDERS.siliconflow.defaultModel,
};

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
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // 安全修复 #4: 错误提示不向用户暴露 API Key，
      // 开发者日志使用脱敏版本
      if (response.status === 401) {
        // 仅在开发模式下打印脱敏 Key 辅助调试
        if (import.meta.env.DEV) {
          console.warn('[AI Service] 鉴权失败, key:', maskApiKey(safeApiKey));
        }
        throw new Error('鉴权失败：请检查 API Key 是否正确 (401)');
      }
      if (response.status === 404) {
        throw new Error('接口未找到：请检查 Base URL 或模型名称 (404)');
      }
      // 安全修复 #5: 生产环境下不暴露原始错误体（可能含敏感信息）
      if (import.meta.env.DEV) {
        console.error('[AI Service] API 错误:', response.status, errorData);
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
你是一个专业的家庭自动化管家。
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
