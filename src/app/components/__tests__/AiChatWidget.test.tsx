
// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AiChatWidget from '../AiChatWidget';
import * as useMobileHook from '@/app/components/ui/use-mobile';

// Mock 依赖模块
vi.mock('@/hooks/useAiChat', () => ({
  useAiChat: () => ({
    messages: [
      { id: 'welcome', role: 'ai', content: '你好！我是 AI 智能管家', timestamp: Date.now() }
    ],
    inputValue: '',
    setInputValue: vi.fn(),
    isLoading: false,
    config: { provider: 'siliconflow', apiKey: 'test-key', modelName: 'test-model', baseUrl: 'https://api.test.com/v1' },
    sendMessage: vi.fn(),
    handleSaveConfig: vi.fn(),
    clearHistory: vi.fn(),
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
    isSpeaking: false,
    isSupported: false,
  })
}));

vi.mock('@/services/ai-service', () => ({
  aiService: { updateConfig: vi.fn(), chat: vi.fn() },
  DEFAULT_CONFIG: { provider: 'siliconflow', apiKey: 'test-key', modelName: 'test-model' },
  AiConfigSchema: { safeParse: () => ({ success: true, data: {} }) },
}));

vi.mock('@/utils/ai-context', () => ({
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

  it('移动端：渲染底部全宽浮窗', () => {
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(true);

    render(<AiChatWidget entities={mockEntities} />);

    // 点击触发按钮
    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    // 查找展开后的容器
    const container = screen.getByTestId('ai-widget-container');
    expect(container).toBeTruthy();
    
    // 检查移动端样式类
    const classes = container.className;
    expect(classes).toContain('bottom-0');
    expect(classes).toContain('left-0');
    expect(classes).toContain('right-0');
    expect(classes).toContain('w-full');
    expect(classes).toContain('h-[85vh]');
    expect(classes).toContain('rounded-t-[24px]');
  });

  it('桌面端：渲染居中浏览窗口', () => {
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(false);

    render(<AiChatWidget entities={mockEntities} />);

    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    const container = screen.getByTestId('ai-widget-container');
    expect(container).toBeTruthy();
    
    // 检查桌面端样式类
    const classes = container.className;
    expect(classes).toContain('w-[380px]');
    expect(classes).toContain('h-[600px]');
    expect(container.style.left).toBe('calc(50% - 190px)');
    expect(container.style.top).toBe('calc(50% - 300px)');
  });

  it('展开后显示欢迎消息和标题栏', () => {
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(false);

    render(<AiChatWidget entities={mockEntities} />);

    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    // 标题栏包含 AI 智能管家
    expect(screen.getByText('AI 智能管家')).toBeTruthy();
    // 欢迎消息在页面中
    expect(screen.getAllByText(/AI 智能管家/).length).toBeGreaterThanOrEqual(1);
  });
});
