import { describe, expect, it } from 'vitest';
import { AI_PROVIDERS, providerSupportsToolCalling } from '@/services/ai-service';

describe('AI provider configuration', () => {
  it('supports Alibaba Bailian and DeepSeek providers', () => {
    expect(AI_PROVIDERS.alibaba.baseUrl).toBe('https://dashscope.aliyuncs.com/compatible-mode/v1');
    expect(AI_PROVIDERS.alibaba.defaultModel).toBe('qwen-plus');
    expect(AI_PROVIDERS.deepseek.baseUrl).toBe('https://api.deepseek.com');
    expect(AI_PROVIDERS.deepseek.defaultModel).toBe('deepseek-chat');
  });

  it('marks non-tool models as query-only', () => {
    expect(providerSupportsToolCalling({
      provider: 'deepseek',
      modelName: 'deepseek-reasoner',
    })).toBe(false);

    expect(providerSupportsToolCalling({
      provider: 'alibaba',
      modelName: 'qwen-plus',
    })).toBe(true);
  });
});
