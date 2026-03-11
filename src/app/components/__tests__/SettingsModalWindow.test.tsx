// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SettingsModal from '../SettingsModal';
import { Device } from '@/types/device';
import { User } from '@/types/user';
import { HAConfig } from '@/types/home-assistant';

// Mock dependencies
vi.mock('@/hooks/useKioskMode', () => ({
  useKioskMode: () => ({ isFullscreen: false, toggleFullscreen: vi.fn() })
}));

vi.mock('@/utils/ha-connection', () => ({
  createOneOffConnection: vi.fn(),
  fetchAreaRegistry: vi.fn(),
  fetchDeviceRegistry: vi.fn(),
  fetchEntityRegistry: vi.fn(),
  verifyConnectionConfig: vi.fn()
}));

// Mock props
const mockProps = {
  isOpen: true,
  onClose: vi.fn(),
  devices: [] as Device[],
  users: [] as User[],
  scenes: [],
  onUpdateUsers: vi.fn(),
  onSave: vi.fn(),
  initialConfig: {
    localUrl: '',
    publicUrl: '',
    token: '',
    deviceMappings: {},
    sceneMappings: {},
    personMappings: {}
  } as HAConfig,
  logs: [],
  onClearLogs: vi.fn(),
  logContainerRef: { current: null }
};

describe.skip('SettingsModal Window Size Strategy', () => {
  const originalInnerWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
  const originalInnerHeightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const originalScreenWidthDescriptor = Object.getOwnPropertyDescriptor(window.screen, 'width');
  const originalScreenHeightDescriptor = Object.getOwnPropertyDescriptor(window.screen, 'height');

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset window size mocks to default large screen
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1920 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 1080 });
    Object.defineProperty(window.screen, 'width', { writable: true, configurable: true, value: 1920 });
    Object.defineProperty(window.screen, 'height', { writable: true, configurable: true, value: 1080 });
  });

  afterEach(() => {
    cleanup();
    // Restore window properties
    if (originalInnerWidthDescriptor) Object.defineProperty(window, 'innerWidth', originalInnerWidthDescriptor);
    if (originalInnerHeightDescriptor) Object.defineProperty(window, 'innerHeight', originalInnerHeightDescriptor);
    if (originalScreenWidthDescriptor) Object.defineProperty(window.screen, 'width', originalScreenWidthDescriptor);
    if (originalScreenHeightDescriptor) Object.defineProperty(window.screen, 'height', originalScreenHeightDescriptor);
  });

  it('initializes with 45% of screen size (1920x1080 -> 864x864)', () => {
    render(<SettingsModal {...mockProps} />);
    
    const header = screen.getByText('系统设置');
    const modalContainer = header.closest('.bg-white.rounded-\\[24px\\]') as HTMLElement;
    
    expect(modalContainer).toBeTruthy();
    expect(modalContainer.style.width).toBe('864px'); // 1920 * 0.45
    expect(modalContainer.style.height).toBe('864px'); // 1080 * 0.8
  });

  it('respects min dimensions (720x720)', () => {
    // Mock small screen
    Object.defineProperty(window.screen, 'width', { writable: true, configurable: true, value: 1000 });
    Object.defineProperty(window.screen, 'height', { writable: true, configurable: true, value: 600 });
    Object.defineProperty(window, 'innerWidth', { value: 1000 });
    Object.defineProperty(window, 'innerHeight', { value: 600 });
    
    render(<SettingsModal {...mockProps} />);
    
    const header = screen.getByText('系统设置');
    const modalContainer = header.closest('.bg-white.rounded-\\[24px\\]') as HTMLElement;
    
    expect(modalContainer.style.width).toBe('720px'); // Min width
    expect(modalContainer.style.height).toBe('720px'); // Min height
  });

  it('persists size to localStorage', () => {
    render(<SettingsModal {...mockProps} />);
    
    const stored = localStorage.getItem('settings_window_size');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.width).toBe(864);
  });

  it('reuses persisted size on next launch', () => {
    // Save a custom size
    localStorage.setItem('settings_window_size', JSON.stringify({ width: 1400, height: 800 }));
    
    render(<SettingsModal {...mockProps} />);
    
    const header = screen.getByText('系统设置');
    const modalContainer = header.closest('.bg-white.rounded-\\[24px\\]') as HTMLElement;
    
    expect(modalContainer.style.width).toBe('1400px');
    expect(modalContainer.style.height).toBe('800px');
  });

  it('maintains size when switching tabs', () => {
    render(<SettingsModal {...mockProps} />);
    
    const header = screen.getByText('系统设置');
    const modalContainer = header.closest('.bg-white.rounded-\\[24px\\]') as HTMLElement;
    const initialWidth = modalContainer.style.width;
    const initialHeight = modalContainer.style.height;
    
    // Switch to Discovery
    fireEvent.click(screen.getByText('设备发现'));
    expect(modalContainer.style.width).toBe(initialWidth);
    expect(modalContainer.style.height).toBe(initialHeight);
    
    // Switch to Devices
    fireEvent.click(screen.getByText('设备管理'));
    expect(modalContainer.style.width).toBe(initialWidth);
    expect(modalContainer.style.height).toBe(initialHeight);
    
    // Switch to Users
    fireEvent.click(screen.getByText('人员管理'));
    expect(modalContainer.style.width).toBe(initialWidth);
    expect(modalContainer.style.height).toBe(initialHeight);
  });
  
  it('cycling tabs does not change size', () => {
    render(<SettingsModal {...mockProps} />);
    const header = screen.getByText('系统设置');
    const modalContainer = header.closest('.bg-white.rounded-\\[24px\\]') as HTMLElement;
    
    const tabs = ['连接配置', '设备发现', '设备管理', '人员管理'];
    const tabEls = tabs.map((t) => screen.getByText(t));
    
    for (let i = 0; i < 12; i++) {
        fireEvent.click(tabEls[i % tabEls.length]);
        
        expect(modalContainer.style.width).toBe('864px');
        expect(modalContainer.style.height).toBe('864px');
    }
  });
});
