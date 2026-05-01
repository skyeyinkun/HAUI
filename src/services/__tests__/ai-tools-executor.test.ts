import { describe, expect, it, vi } from 'vitest';
import { executeHaTools } from '@/services/ai-tools-executor';

const makeToolCall = (name: string, args: Record<string, unknown>, id = name) => ({
  id,
  function: {
    name,
    arguments: JSON.stringify(args),
  },
});

const entities: any = {
  'light.living_room': {
    entity_id: 'light.living_room',
    state: 'on',
    attributes: {
      friendly_name: '客厅主灯',
      brightness: 180,
    },
    last_changed: '2026-04-30T00:00:00.000Z',
    last_updated: '2026-04-30T00:00:00.000Z',
  },
  'sensor.living_room_temperature': {
    entity_id: 'sensor.living_room_temperature',
    state: '24.6',
    attributes: {
      friendly_name: '客厅温度',
      device_class: 'temperature',
      unit_of_measurement: '°C',
    },
    last_changed: '2026-04-30T00:00:00.000Z',
    last_updated: '2026-04-30T00:00:00.000Z',
  },
  'lock.front_door': {
    entity_id: 'lock.front_door',
    state: 'locked',
    attributes: {
      friendly_name: '入户门锁',
    },
    last_changed: '2026-04-30T00:00:00.000Z',
    last_updated: '2026-04-30T00:00:00.000Z',
  },
};

describe('executeHaTools', () => {
  it('finds entities by friendly name', async () => {
    const results = await executeHaTools(entities, [
      makeToolCall('find_entities', { query: '客厅', limit: 5 }),
    ]);

    const payload = JSON.parse(results[0].content);
    expect(payload.map((item: any) => item.entity_id)).toContain('light.living_room');
    expect(payload.map((item: any) => item.entity_id)).toContain('sensor.living_room_temperature');
  });

  it('returns safe entity details for state lookup', async () => {
    const results = await executeHaTools(entities, [
      makeToolCall('get_entity_state', { entity_id: 'sensor.living_room_temperature' }),
    ]);

    const payload = JSON.parse(results[0].content);
    expect(payload.state).toBe('24.6');
    expect(payload.attributes.unit_of_measurement).toBe('°C');
  });

  it('uses the provided app service caller for safe device control', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);

    const results = await executeHaTools(entities, [
      makeToolCall('call_ha_service', {
        domain: 'light',
        service: 'turn_off',
        service_data: { entity_id: 'light.living_room' },
      }),
    ], callService);

    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.living_room' });
    const payload = JSON.parse(results[0].content);
    expect(payload.ok).toBe(true);
    expect(payload.targets).toEqual(['客厅主灯']);
    expect(payload.entity_id).toBeUndefined();
  });

  it('corrects a model-supplied domain when entity_id already identifies the real domain', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);

    const results = await executeHaTools(entities, [
      makeToolCall('call_ha_service', {
        domain: 'switch',
        service: 'turn_off',
        service_data: { entity_id: 'light.living_room' },
      }),
    ], callService);

    expect(callService).toHaveBeenCalledWith('light', 'turn_off', { entity_id: 'light.living_room' });
    const payload = JSON.parse(results[0].content);
    expect(payload.ok).toBe(true);
    expect(payload.action).toBe('light.turn_off');
  });

  it('blocks high-risk lock control', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);

    const results = await executeHaTools(entities, [
      makeToolCall('call_ha_service', {
        domain: 'lock',
        service: 'unlock',
        service_data: { entity_id: 'lock.front_door' },
      }),
    ], callService);

    expect(callService).not.toHaveBeenCalled();
    expect(results[0].content).toContain('操作执行失败');
    expect(results[0].content).toContain('高风险');
  });

  it('blocks wildcard or all-entity control', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);

    const results = await executeHaTools(entities, [
      makeToolCall('call_ha_service', {
        domain: 'light',
        service: 'turn_off',
        service_data: { entity_id: 'all' },
      }),
    ], callService);

    expect(callService).not.toHaveBeenCalled();
    expect(results[0].content).toContain('全域');
  });

  it('blocks control for unknown entities before calling Home Assistant', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);

    const results = await executeHaTools(entities, [
      makeToolCall('call_ha_service', {
        domain: 'light',
        service: 'turn_on',
        service_data: { entity_id: 'light.not_exists' },
      }),
    ], callService);

    expect(callService).not.toHaveBeenCalled();
    expect(results[0].content).toContain('找不到目标实体');
  });
});
