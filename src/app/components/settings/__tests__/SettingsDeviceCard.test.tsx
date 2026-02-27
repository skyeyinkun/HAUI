
// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { SettingsDeviceCard } from '../SettingsDeviceCard';
import { Device } from '@/types/device';

expect.extend(matchers);

describe('SettingsDeviceCard', () => {
  afterEach(() => {
    cleanup();
  });

  const mockDevice: Device = {
    id: 1,
    name: 'Test Device',
    entity_id: 'light.test',
    icon: 'Lightbulb',
    count: '',
    power: '',
    isOn: true,
    room: 'Living Room',
    type: 'light',
    haAvailable: true
  };

  it('renders device info correctly', () => {
    render(
      <SettingsDeviceCard 
        device={mockDevice} 
        onClick={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );

    expect(screen.getByText('Test Device')).toBeInTheDocument();
    expect(screen.getByText('Living Room')).toBeInTheDocument();
    expect(screen.getByText('light.test')).toBeInTheDocument();
    expect(screen.getByText('开启')).toBeInTheDocument();
  });

  it('handles offline status', () => {
    render(
      <SettingsDeviceCard 
        device={{ ...mockDevice, haAvailable: false }} 
        onClick={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );

    expect(screen.getByText('离线')).toBeInTheDocument();
  });

  it('calls onClick handler', () => {
    const handleClick = vi.fn();
    render(
      <SettingsDeviceCard 
        device={mockDevice} 
        onClick={handleClick} 
        onEdit={vi.fn()} 
      />
    );

    fireEvent.click(screen.getByText('Test Device').closest('div')!);
    expect(handleClick).toHaveBeenCalled();
  });
});
