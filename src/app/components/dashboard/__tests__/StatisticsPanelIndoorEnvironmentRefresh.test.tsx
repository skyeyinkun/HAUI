// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { StatisticsPanel } from '../StatisticsPanel';

expect.extend(matchers);

describe('StatisticsPanel indoor environment refresh', () => {
  afterEach(() => {
    cleanup();
  });
  const baseProps = {
    weather: null,
    lightsOn: 0,
    logs: [],
    nowMs: Date.now(),
    setLogModalOpen: vi.fn(),
    clearLogs: vi.fn(),
    logContainerRef: { current: null } as any
  };
  const getEnvRefreshButton = () => screen.getByTestId('refresh-indoor-environment') as HTMLButtonElement;

  it('renders indoor environment refresh button with same style contract', () => {
    render(
      <StatisticsPanel
        {...baseProps}
        devices={[
          { id: 101, name: '室内温度', type: 'sensor', icon: 'thermometer', count: '23°C', power: '', isOn: true, room: '客厅', deviceClass: 'temperature' } as any
        ]}
        onRefreshSensors={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const btn = getEnvRefreshButton();
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('w-8');
    expect(btn).toHaveClass('h-8');
    expect(btn).toHaveClass('rounded-full');
  });

  it('calls onRefreshSensors and shows loading state', async () => {
    const deferred: { resolve: () => void; promise: Promise<void> } = (() => {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => (resolve = r));
      return { resolve, promise };
    })();
    const onRefreshSensors = vi.fn(() => deferred.promise);

    render(
      <StatisticsPanel
        {...baseProps}
        devices={[
          { id: 101, name: '室内温度', type: 'sensor', icon: 'thermometer', count: '23°C', power: '', isOn: true, room: '客厅', deviceClass: 'temperature' } as any
        ]}
        onRefreshSensors={onRefreshSensors}
      />
    );

    const btn = getEnvRefreshButton();
    fireEvent.click(btn);

    expect(onRefreshSensors).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();

    deferred.resolve();
    await waitFor(() => expect(btn).not.toBeDisabled());
  });

  it('handles refresh error and exposes error via title', async () => {
    const onRefreshSensors = vi.fn().mockRejectedValue(new Error('Network error'));
    render(
      <StatisticsPanel
        {...baseProps}
        devices={[
          { id: 101, name: '室内温度', type: 'sensor', icon: 'thermometer', count: '23°C', power: '', isOn: true, room: '客厅', deviceClass: 'temperature' } as any
        ]}
        onRefreshSensors={onRefreshSensors}
      />
    );

    const btn = getEnvRefreshButton();
    fireEvent.click(btn);

    await waitFor(() => {
      expect(btn).toHaveAttribute('title', '室内环境刷新失败：Network error');
    });
  });
});
