// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { HassEntities } from 'home-assistant-js-websocket';
import type { CardConfig } from '@/types/card-config';
import { ConfigurableEntityCard } from '../ConfigurableEntityCard';

describe('ConfigurableEntityCard responsive rendering', () => {
  it('renders stable layout snapshot', () => {
    const entities: HassEntities = {
      'sensor.temperature_living_room': {
        entity_id: 'sensor.temperature_living_room',
        state: '24.5',
        attributes: { friendly_name: '客厅温度', unit_of_measurement: '°C' },
        last_changed: '2026-02-02T04:08:01.924022+00:00',
        last_updated: '2026-02-02T04:08:01.924022+00:00',
      } as any,
    };

    const defaultConfig: CardConfig = {
      title: '室内环境',
      icon: 'Thermometer',
      entities: [{ entity_id: 'sensor.temperature_living_room', ha_name: '客厅温度', display_name: '客厅温度', icon: 'Thermometer', visible: true }],
    };

    const { container } = render(
      <div style={{ width: 320 }}>
        <ConfigurableEntityCard
          cardId="test_card"
          defaultConfig={defaultConfig}
          haEntities={entities}
          nowMs={new Date('2026-02-02T04:08:10.000Z').getTime()}
          fetchStates={async () => []}
        />
      </div>
    );

    expect(container).toMatchSnapshot();
  });
});

