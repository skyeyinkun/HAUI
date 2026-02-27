// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DeviceCard } from '@/app/components/dashboard/DeviceCard';
import { Device } from '@/types/device';

describe('DeviceCard sensor status + availability', () => {
  it('does not mark stable moisture sensor as offline', () => {
    const device: Device = {
      id: 1,
      name: '水浸',
      icon: 'motion',
      count: '',
      power: '',
      isOn: true,
      room: '卫生间',
      type: 'binary_sensor',
      deviceClass: 'moisture',
      haState: 'off',
      haAvailable: true,
      lastChanged: '2026-01-30T07:45:38.605105+00:00'
    };

    render(
      <DeviceCard
        device={device}
        onToggle={() => {}}
        onClick={() => {}}
        nowMs={new Date('2026-02-02T04:08:10.000Z').getTime()}
      />
    );

    expect(screen.getByText('正常')).toBeTruthy();
    expect(screen.queryByText('离线')).toBeNull();
    expect(
      screen.getByText((text) => text.replace(/\s+/g, '').startsWith('最后更新：2026-01-30'), { selector: 'span' })
    ).toBeTruthy();
  });

  it('highlights occupancy sensor as 有人 and shows compact timestamp', () => {
    const device: Device = {
      id: 2,
      name: '书房人在传感',
      icon: 'motion',
      count: '',
      power: '',
      isOn: false,
      room: '书房',
      type: 'binary_sensor',
      deviceClass: 'occupancy',
      haState: 'on',
      haAvailable: true,
      lastChanged: '2026-02-02T04:08:01.924022+00:00'
    };

    render(
      <DeviceCard
        device={device}
        onToggle={() => {}}
        onClick={() => {}}
        nowMs={new Date('2026-02-02T04:08:10.000Z').getTime()}
      />
    );

    expect(screen.getByText('有人')).toBeTruthy();
    expect(
      screen.getAllByText((text) => /^更新于\d{2}:\d{2}:\d{2}$/.test(text.replace(/\s+/g, '')), { selector: 'span' }).length
    ).toBeGreaterThan(0);
  });
});
