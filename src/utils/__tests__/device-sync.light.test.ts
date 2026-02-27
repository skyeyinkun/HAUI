import { describe, it, expect } from 'vitest';
import { syncDevicesWithEntities } from '@/utils/device-sync';

describe('syncDevicesWithEntities (light brightness sync)', () => {
  it('sets brightness to 0 when HA light is off even if attribute retains value', () => {
    const devices: any[] = [
      {
        id: 1,
        name: '书房灯带',
        icon: 'lamp',
        count: '0',
        power: '0',
        isOn: true,
        room: '书房',
        type: 'light',
        brightness: 255,
        color_temp: 250,
      },
    ];

    const entities: any = {
      'light.shu_fang_deng_dai': {
        state: 'off',
        attributes: {
          brightness: 255,
          color_temp: 260,
        },
        last_updated: '2026-02-03T00:00:00.000Z',
        last_changed: '2026-02-03T00:00:00.000Z',
      },
    };

    const mappings = { 1: 'light.shu_fang_deng_dai' };
    const next = syncDevicesWithEntities(devices as any, entities, mappings);

    expect(next[0].isOn).toBe(false);
    expect(next[0].brightness).toBe(0);
    expect(next[0].color_temp).toBe(260);
  });

  it('syncs brightness from HA when light is on', () => {
    const devices: any[] = [
      {
        id: 1,
        name: '书房灯带',
        icon: 'lamp',
        count: '0',
        power: '0',
        isOn: false,
        room: '书房',
        type: 'light',
        brightness: 0,
      },
    ];

    const entities: any = {
      'light.shu_fang_deng_dai': {
        state: 'on',
        attributes: {
          brightness: 123,
        },
        last_updated: '2026-02-03T00:00:00.000Z',
        last_changed: '2026-02-03T00:00:00.000Z',
      },
    };

    const mappings = { 1: 'light.shu_fang_deng_dai' };
    const next = syncDevicesWithEntities(devices as any, entities, mappings);

    expect(next[0].isOn).toBe(true);
    expect(next[0].brightness).toBe(123);
  });
});

