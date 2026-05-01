import { describe, expect, it } from 'vitest';
import { sanitizeAiResponseForDisplay } from '@/utils/ai-context';

const entities: any = {
  'binary_sensor.shu_fang_ren_zai_chuan_gan_ci_chu_you_ren': {
    entity_id: 'binary_sensor.shu_fang_ren_zai_chuan_gan_ci_chu_you_ren',
    state: 'on',
    attributes: {
      friendly_name: '书房人在传感器此处有人',
      icon: 'mdi:motion-sensor',
    },
  },
};

describe('sanitizeAiResponseForDisplay', () => {
  it('replaces entity ids and slugs with friendly names', () => {
    const text = 'binary_sensor.shu_fang_ren_zai_chuan_gan_ci_chu_you_ren 当前 on，图标: mdi:motion-sensor';
    const result = sanitizeAiResponseForDisplay(text, entities);

    expect(result).toContain('书房人在传感器此处有人');
    expect(result).not.toContain('shu_fang_ren_zai_chuan_gan_ci_chu_you_ren');
    expect(result).not.toContain('mdi:motion-sensor');
    expect(result).not.toContain('图标');
  });
});
