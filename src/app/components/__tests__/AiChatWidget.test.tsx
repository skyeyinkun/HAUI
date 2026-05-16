
// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AiChatWidget from '../AiChatWidget';
import * as useMobileHook from '@/app/components/ui/use-mobile';

// Mock 依赖模块
vi.mock('@/hooks/useAiChat', () => ({
  useAiChat: () => ({
    messages: [
      { id: 'welcome', role: 'ai', content: '你好！我是 AI 助手', timestamp: Date.now() }
    ],
    inputValue: '',
    setInputValue: vi.fn(),
    isLoading: false,
    config: { provider: 'alibaba', apiKey: 'test-key', modelName: 'test-model', baseUrl: 'https://api.test.com/v1' },
    sendMessage: vi.fn(),
    handleSaveConfig: vi.fn(),
    clearHistory: vi.fn(),
    abortChat: vi.fn(),
  })
}));

vi.mock('@/hooks/useSpeechRecognition', () => ({
  useSpeechRecognition: () => ({
    isListening: false,
    transcript: '',
    interimTranscript: '',
    isSupported: false,
    startListening: vi.fn(),
    stopListening: vi.fn(),
    resetTranscript: vi.fn(),
    error: null,
  })
}));

vi.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    isSpeaking: false,
    isPaused: false,
    isSupported: false,
    voices: [],
    selectedVoiceURI: '',
    setSelectedVoiceURI: vi.fn(),
    rate: 1,
    setRate: vi.fn(),
  })
}));

vi.mock('@/services/ai-service', () => ({
  aiService: { updateConfig: vi.fn(), chat: vi.fn() },
  DEFAULT_CONFIG: { provider: 'alibaba', apiKey: 'test-key', modelName: 'test-model' },
  AiConfigSchema: { safeParse: () => ({ success: true, data: {} }) },
}));

vi.mock('@/utils/ai-context', () => ({
  getDeviceSummary: vi.fn().mockReturnValue('当前无可用设备。'),
  getSmartHomeContext: vi.fn().mockReturnValue('设备概览：共0个实体\n[]')
}));

// Mock ResizeObserver (Framer Motion 依赖)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('AiChatWidget 布局测试', () => {
  const mockEntities = {};

  beforeEach(() => {
    vi.resetAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });
  
  afterEach(() => {
    cleanup();
  });

  it('移动端：渲染浮动窗口', () => {
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(true);

    render(<AiChatWidget entities={mockEntities} />);

    // 点击触发按钮
    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    // 查找展开后的容器
    const container = screen.getByTestId('ai-widget-container');
    expect(container).toBeTruthy();
    
    // 检查当前浮动窗口样式类
    const classes = container.className;
    expect(classes).toContain('fixed');
    expect(classes).toContain('bottom-24');
    expect(classes).toContain('right-6');
    expect(classes).toContain('max-w-[380px]');
    expect(classes).toContain('max-h-[80vh]');
  });

  it('桌面端：渲染浮动窗口', () => {
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(false);

    render(<AiChatWidget entities={mockEntities} />);

    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    const container = screen.getByTestId('ai-widget-container');
    expect(container).toBeTruthy();
    
    // 检查桌面端样式类
    const classes = container.className;
    expect(classes).toContain('fixed');
    expect(classes).toContain('bottom-24');
    expect(classes).toContain('right-6');
    expect(classes).toContain('max-w-[380px]');
    expect(classes).toContain('h-[650px]');
  });

  it('展开后显示欢迎消息和标题栏', () => {
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(false);

    render(<AiChatWidget entities={mockEntities} />);

    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    // 标题栏包含 AI 助手
    expect(screen.getByText('AI 助手')).toBeTruthy();
    // 欢迎消息在页面中
    expect(screen.getAllByText(/AI 助手/).length).toBeGreaterThanOrEqual(1);
  });

  it('通过 openSignal 打开后关闭不会因重新渲染再次弹出', async () => {
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(true);
    const onVisibilityChange = vi.fn();

    const { rerender } = render(
      <AiChatWidget
        entities={mockEntities}
        openSignal={1}
        onVisibilityChange={onVisibilityChange}
      />
    );

    expect(screen.getByTestId('ai-widget-container')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '关闭 AI 助手' }));

    await waitFor(() => expect(screen.queryByTestId('ai-widget-container')).toBeNull());
    rerender(
      <AiChatWidget
        entities={mockEntities}
        openSignal={1}
        onVisibilityChange={onVisibilityChange}
      />
    );

    await waitFor(() => expect(screen.queryByTestId('ai-widget-container')).toBeNull());
    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });
});
