
// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { DeviceDiscoveryPanel } from '../DeviceDiscoveryPanel';
import { Device } from '@/types/device';

expect.extend(matchers);

// Mock dependencies
vi.mock('@/hooks/useHomeAssistant', () => ({
  useHomeAssistant: () => ({
    fetchStatesRest: vi.fn().mockResolvedValue([
      { entity_id: 'light.new', attributes: { friendly_name: 'New Light' }, state: 'on' }
    ]),
    isConnected: true
  })
}));

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
    haConfig: { deviceMappings: {} },
    onUpdateConfig: vi.fn(),
    rooms: ['Living Room', 'Kitchen']
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
