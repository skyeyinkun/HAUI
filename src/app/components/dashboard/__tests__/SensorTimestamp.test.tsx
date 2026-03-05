// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SensorTimestamp } from '@/app/components/dashboard/SensorTimestamp';

describe('SensorTimestamp', () => {
  it('shows full timestamp with required format', () => {
    render(
      <SensorTimestamp
        lastChanged="2026-02-02T04:08:01.924022+00:00"
        available={true}
        nowMs={new Date('2026-02-02T04:08:10.000Z').getTime()}
        variant="full"
      />
    );

    expect(
      screen.getByText((text) => {
        const compact = text.replace(/\s+/g, '');
        return compact.startsWith('最后更新：2026-02-02') && /\d{2}:\d{2}:\d{2}$/.test(compact);
      }, { selector: 'span' })
    ).toBeTruthy();
  });

  it('shows offline only when availability is false', () => {
    render(
      <SensorTimestamp
        lastChanged="2026-01-30T07:45:38.605105+00:00"
        available={true}
        nowMs={new Date('2026-02-02T04:08:10.000Z').getTime()}
        variant="compact"
      />
    );
    expect(screen.queryByText('离线')).toBeNull();

    render(
      <SensorTimestamp
        lastChanged="2026-01-30T07:45:38.605105+00:00"
        available={false}
        nowMs={new Date('2026-02-02T04:08:10.000Z').getTime()}
        variant="compact"
      />
    );
    expect(screen.getByText('离线')).toBeTruthy();
  });
});
