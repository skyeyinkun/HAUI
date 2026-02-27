import { HassEntities } from 'home-assistant-js-websocket';

export function getSmartHomeContext(entities: HassEntities): string {
  const IGNORED_DOMAINS = [
    'update', 
    'script', 
    'automation', 
    'zone', 
    'person', 
    'scene',
    'timer',
    'sun',
    'weather' // Sometimes weather is useful, but spec said physical devices. I'll keep weather out if strictly following "non-physical", but user example "how many degrees at home" implies sensors or climate. Weather is external. I'll exclude it for now based on "update, script..." list being explicit, but `input_*` matches many.
    // The user list: update, script, automation, zone, person, input_*
  ];

  const IGNORED_PREFIXES = ['input_'];

  const simplifiedEntities = Object.values(entities)
    .filter(entity => {
      const domain = entity.entity_id.split('.')[0];
      if (IGNORED_DOMAINS.includes(domain)) return false;
      if (IGNORED_PREFIXES.some(prefix => domain.startsWith(prefix))) return false;
      return true;
    })
    .map(entity => {
      const attributes: any = {};
      if (entity.attributes.friendly_name) {
        attributes.friendly_name = entity.attributes.friendly_name;
      }
      if (entity.attributes.unit_of_measurement) {
        attributes.unit_of_measurement = entity.attributes.unit_of_measurement;
      }
      // Keep device_class as it's useful for context (e.g. knowing it's a door vs window)
      if (entity.attributes.device_class) {
        attributes.device_class = entity.attributes.device_class;
      }

      return {
        entity_id: entity.entity_id,
        state: entity.state,
        attributes: attributes
      };
    });

  return JSON.stringify(simplifiedEntities);
}
