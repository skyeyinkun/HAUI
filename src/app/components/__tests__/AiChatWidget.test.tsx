
// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AiChatWidget from '../AiChatWidget';
import * as useMobileHook from '@/app/components/ui/use-mobile';

// Mock dependencies
vi.mock('@/services/ai-service', () => ({
  aiService: {
    updateConfig: vi.fn(),
    chat: vi.fn()
  },
  DEFAULT_CONFIG: {
    provider: 'siliconflow',
    apiKey: 'test-key',
    modelName: 'test-model'
  }
}));

vi.mock('@/utils/ai-context', () => ({
  getSmartHomeContext: vi.fn().mockReturnValue({})
}));

// Mock ResizeObserver for Framer Motion
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('AiChatWidget Mobile Layout', () => {
  const mockEntities = {};
  const mockCallService = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });
  
  afterEach(() => {
    cleanup();
  });

  it('renders centered floating window on mobile', () => {
    // Mock isMobile = true
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(true);

    render(<AiChatWidget entities={mockEntities} callService={mockCallService} />);

    // Click trigger button
    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    // Find the widget container
    const container = screen.getByTestId('ai-widget-container');

    expect(container).toBeTruthy();
    
    // Check for mobile classes
    const classes = container.className;
    expect(classes).toContain('bottom-0');
    expect(classes).toContain('left-0');
    expect(classes).toContain('right-0');
    expect(classes).toContain('w-full');
    expect(classes).toContain('h-[85vh]');
    expect(classes).toContain('rounded-t-[24px]');
  });

  it('renders centered floating window on desktop', () => {
    // Mock isMobile = false
    vi.spyOn(useMobileHook, 'useIsMobile').mockReturnValue(false);

    render(<AiChatWidget entities={mockEntities} callService={mockCallService} />);

    const triggerBtn = screen.getByTestId('ai-trigger-btn');
    fireEvent.click(triggerBtn);

    const container = screen.getByTestId('ai-widget-container');

    expect(container).toBeTruthy();
    
    // Check for desktop classes
    const classes = container.className;
    expect(classes).toContain('w-[380px]');
    expect(classes).toContain('h-[600px]');
    expect(container.style.left).toBe('calc(50% - 190px)');
    expect(container.style.top).toBe('calc(50% - 300px)');
  });
});
