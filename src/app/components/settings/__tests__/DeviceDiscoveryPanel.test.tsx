
// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { DeviceDiscoveryPanel } from '../DeviceDiscoveryPanel';
import { Device } from '@/types/device';

// Mock dependencies - DeviceDiscoveryPanel 现在从 props 接收连接状态
// 不再需要 mock useHomeAssistant

vi.mock('@/utils/device-discovery', () => ({
  discoverDevicesFromStates: vi.fn().mockReturnValue({
    devices: [
        { id: 100, name: 'Existing Device', entity_id: 'light.existing' },
        { id: 101, name: 'New Light', entity_id: 'light.new' }
    ],
    mappings: {},
    newCount: 1
  })
}));

describe('DeviceDiscoveryPanel', () => {
  afterEach(() => {
    cleanup();
  });

  const mockDevices: Device[] = [
    {
      id: 100,
      name: 'Existing Device',
      entity_id: 'light.existing',
      icon: 'Lightbulb',
      count: '',
      power: '',
      isOn: false,
      room: 'Living Room',
      type: 'light',
      category: 'lighting',
      haAvailable: true
    }
  ];

  const defaultProps = {
    devices: mockDevices,
    onUpdateDevices: vi.fn(),
    haConfig: { 
      deviceMappings: {},
      localUrl: '',
      publicUrl: '',
      token: '',
      personMappings: {},
      sceneMappings: {}
    },
    onUpdateConfig: vi.fn(),
    rooms: ['Living Room', 'Kitchen'],
    isConnected: true,
    fetchStatesRest: vi.fn().mockResolvedValue([
      { entity_id: 'light.new', attributes: { friendly_name: 'New Light' }, state: 'on' }
    ]),
    areas: [],
    devicesRegistry: [],
    entitiesRegistry: []
  };

  it('renders correctly', () => {
    render(<DeviceDiscoveryPanel {...defaultProps} />);
    expect(screen.getByText('全部')).toBeInTheDocument();
  });

  it('shows scan button', () => {
    render(<DeviceDiscoveryPanel {...defaultProps} />);
    expect(screen.getByText('刷新列表')).toBeInTheDocument();
  });

  // More interaction tests would go here
});
