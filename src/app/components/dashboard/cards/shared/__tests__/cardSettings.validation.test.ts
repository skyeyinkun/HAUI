import { describe, expect, it } from 'vitest';
import { canAddEntity, isValidCardTitle, sanitizeCardTitle } from '../cardSettings.validation';

describe('card settings validation', () => {
  it('sanitizes title and enforces max length 20', () => {
    const input = '室内@环境!卡片###标题_超长超长超长超长超长';
    const out = sanitizeCardTitle(input);
    expect(out.includes('@')).toBe(false);
    expect(out.includes('!')).toBe(false);
    expect(out.includes('#')).toBe(false);
    expect(out.includes('_')).toBe(false);
    expect(out.length).toBeLessThanOrEqual(20);
  });

  it('validates title rules', () => {
    expect(isValidCardTitle('')).toBe(false);
    expect(isValidCardTitle('   ')).toBe(false);
    expect(isValidCardTitle('环境卡片01')).toBe(true);
    expect(isValidCardTitle('环境-卡片')).toBe(false);
    expect(isValidCardTitle('环境'.repeat(11))).toBe(false);
  });

  it('limits entity count to 6', () => {
    expect(canAddEntity(0)).toBe(true);
    expect(canAddEntity(5)).toBe(true);
    expect(canAddEntity(6)).toBe(false);
    expect(canAddEntity(10)).toBe(false);
  });
});
