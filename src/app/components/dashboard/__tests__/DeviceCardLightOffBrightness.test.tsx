// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { DeviceCard } from '../DeviceCard';

expect.extend(matchers);

vi.mock('@/app/components/dashboard/SensorTimestamp', () => ({
  SensorTimestamp: () => <div data-testid="sensor-timestamp" />
}));

vi.mock('../remote/RemoteCard', () => ({
  default: () => <div data-testid="remote-card" />
}));

vi.mock('@/imports/svg-vz3fosb0v5', () => ({
  default: {}
}));

vi.mock('@/assets/toggle_switch.png', () => ({
  default: 'mock-image.png'
}));

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('DeviceCard Light display', () => {
  it('shows brightness 0 when light is off even if cached brightness is 255', () => {
    render(
      <DeviceCard
        device={{
          id: 1,
          name: '书房灯带',
          icon: 'lamp',
          count: '0',
          power: '0',
          isOn: false,
          room: '书房',
          type: 'light',
          brightness: 255,
          color_temp: 250,
        } as any}
        onToggle={vi.fn()}
        onClick={vi.fn()}
        onUpdate={vi.fn()}
      />
    );

    expect(screen.getByText('亮度 0')).toBeInTheDocument();
    expect(screen.queryByText(/亮度\s+100/)).not.toBeInTheDocument();
  });
});

