import { describe, expect, it, vi } from 'vitest';
import {
  createQuickControlPlan,
  executeQuickControlPlan,
  summarizeControlToolResults,
} from '@/services/ai-quick-control';

const entities: any = {
  'switch.wall_switch_4': {
    entity_id: 'switch.wall_switch_4',
    state: 'off',
    attributes: { friendly_name: '书房主灯' },
    last_changed: '2026-04-30T00:00:00.000Z',
    last_updated: '2026-04-30T00:00:00.000Z',
  },
  'light.living_room': {
    entity_id: 'light.living_room',
    state: 'on',
    attributes: { friendly_name: '客厅灯' },
    last_changed: '2026-04-30T00:00:00.000Z',
    last_updated: '2026-04-30T00:00:00.000Z',
  },
  'light.shu_fang_deng_dai': {
    entity_id: 'light.shu_fang_deng_dai',
    state: 'on',
    attributes: { friendly_name: '书房灯带' },
    last_changed: '2026-04-30T00:00:00.000Z',
    last_updated: '2026-04-30T00:00:00.000Z',
  },
};

describe('ai quick control', () => {
  it('creates a direct switch control plan for a light-like friendly name', () => {
    const plan = createQuickControlPlan('打开书房主灯', entities, true, true);

    expect(plan?.kind).toBe('execute');
    if (plan?.kind !== 'execute') return;

    const args = JSON.parse(plan.toolCall.function.arguments);
    expect(plan.pendingMessage).toBe('正在打开书房主灯...');
    expect(args.domain).toBe('switch');
    expect(args.service).toBe('turn_on');
    expect(args.service_data.entity_id).toBe('switch.wall_switch_4');
  });

  it('matches natural language particles to the exact friendly name', () => {
    const plan = createQuickControlPlan('请帮我打开书房里的主灯', entities, true, true);

    expect(plan?.kind).toBe('execute');
    if (plan?.kind !== 'execute') return;

    const args = JSON.parse(plan.toolCall.function.arguments);
    expect(plan.pendingMessage).toBe('正在打开书房主灯...');
    expect(args.domain).toBe('switch');
    expect(args.service_data.entity_id).toBe('switch.wall_switch_4');
  });

  it('controls a precise light strip name without being confused by another study light', () => {
    const plan = createQuickControlPlan('关闭书房灯带', entities, true, true);

    expect(plan?.kind).toBe('execute');
    if (plan?.kind !== 'execute') return;

    const args = JSON.parse(plan.toolCall.function.arguments);
    expect(plan.pendingMessage).toBe('正在关闭书房灯带...');
    expect(args.domain).toBe('light');
    expect(args.service).toBe('turn_off');
    expect(args.service_data.entity_id).toBe('light.shu_fang_deng_dai');
  });

  it('prefers the real light entity when duplicate display names include a helper switch', () => {
    const duplicateEntities = {
      ...entities,
      'switch.shu_fang_deng_dai': {
        entity_id: 'switch.shu_fang_deng_dai',
        state: 'on',
        attributes: { friendly_name: '书房灯带' },
        last_changed: '2026-04-30T00:00:00.000Z',
        last_updated: '2026-04-30T00:00:00.000Z',
      },
    };
    const plan = createQuickControlPlan('关闭书房灯带', duplicateEntities, true, true);

    expect(plan?.kind).toBe('execute');
    if (plan?.kind !== 'execute') return;

    const args = JSON.parse(plan.toolCall.function.arguments);
    expect(args.domain).toBe('light');
    expect(args.service_data.entity_id).toBe('light.shu_fang_deng_dai');
  });

  it('returns a concise failure when Home Assistant is not connected', () => {
    const plan = createQuickControlPlan('关闭客厅灯', entities, false, true);

    expect(plan).toEqual({
      kind: 'fail',
      finalMessage: '关闭失败：Home Assistant 未连接',
    });
  });

  it('executes a quick control plan and returns only the final result', async () => {
    const callService = vi.fn().mockResolvedValue(undefined);
    const plan = createQuickControlPlan('打开书房主灯', entities, true, true);

    expect(plan?.kind).toBe('execute');
    if (plan?.kind !== 'execute') return;

    const result = await executeQuickControlPlan(plan, entities, callService);

    expect(callService).toHaveBeenCalledWith('switch', 'turn_on', { entity_id: 'switch.wall_switch_4' });
    expect(result).toBe('已打开书房主灯');
  });

  it('summarizes model tool-call control results without service details', () => {
    const summary = summarizeControlToolResults(
      entities,
      [{
        id: 'tool-1',
        function: {
          name: 'call_ha_service',
          arguments: JSON.stringify({
            domain: 'light',
            service: 'turn_off',
            service_data: { entity_id: 'light.living_room' },
          }),
        },
      }],
      [{
        tool_call_id: 'tool-1',
        content: JSON.stringify({ ok: true }),
      }]
    );

    expect(summary).toBe('已关闭客厅灯');
  });
});
