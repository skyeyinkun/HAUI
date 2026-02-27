
import fs from 'fs';
import path from 'path';

// Standardized 24x24 grid, 2px stroke, rounded linejoin/linecap
const commonAttrs = 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const icons = {
  climate: {
    // Temperature: Thermometer
    temp: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" ${commonAttrs}/></svg>`,
    // Humidity: Droplet
    humidity: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z" ${commonAttrs}/></svg>`,
    // CO2: Cloud with CO2 text (Simplified to generic air/cloud for line icon consistency or just Cloud)
    // Using Cloud for general air quality
    co2: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3" ${commonAttrs}/><path d="M17.5 19c1.7 0 3-1.3 3-3 0-1.4-1-2.5-2.3-2.9C18 12.8 18 12.4 18 12c0-3.3-2.7-6-6-6-2.9 0-5.3 2.1-5.9 4.9C4.5 11.2 3 12.8 3 14.5" ${commonAttrs}/></svg>`,
    // VOC: Flask/Chemical
    voc: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2v7.31" ${commonAttrs}/><path d="M14 2v7.31" ${commonAttrs}/><path d="M8.5 2h7" ${commonAttrs}/><path d="M14 9.3a6.5 6.5 0 1 1-4 0" ${commonAttrs}/></svg>`,
    // PM2.5: Wind/Particles
    pm25: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.59 4.59A2 2 0 1 1 11 8H2" ${commonAttrs}/><path d="M12.59 19.41A2 2 0 1 0 14 16H2" ${commonAttrs}/><path d="M17.59 11.41A2 2 0 1 1 19 8H2" ${commonAttrs}/></svg>`,
    // Light: Sun
    light: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4" ${commonAttrs}/><path d="M12 2v2" ${commonAttrs}/><path d="M12 20v2" ${commonAttrs}/><path d="M4.93 4.93l1.41 1.41" ${commonAttrs}/><path d="M17.66 17.66l1.41 1.41" ${commonAttrs}/><path d="M2 12h2" ${commonAttrs}/><path d="M20 12h2" ${commonAttrs}/><path d="M6.34 17.66l-1.41 1.41" ${commonAttrs}/><path d="M19.07 4.93l-1.41 1.41" ${commonAttrs}/></svg>`,
    // Noise: Activity/Waveform
    noise: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 12h-4l-3 9L9 3l-3 9H2" ${commonAttrs}/></svg>`,
  },
  sensor: {
    // Water: Waves/Water
    water: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" ${commonAttrs}/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" ${commonAttrs}/><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" ${commonAttrs}/></svg>`,
    // Door: Door open
    door: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" ${commonAttrs}/><path d="M2 20h20" ${commonAttrs}/><path d="M14 12v.01" ${commonAttrs}/></svg>`,
    // Presence: User
    presence: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" ${commonAttrs}/><circle cx="12" cy="7" r="4" ${commonAttrs}/></svg>`,
    // Motion: Footprints or Running
    motion: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 16v-2.38C4 11.5 9.93 10.75 11 10c1.38-.97 2.06-1.49 3.32-.45C16.16 11.11 19 14 19 14" ${commonAttrs}/><path d="M10 22v-4c0-1.1.9-2 2-2h3c1.1 0 2 .9 2 2v4" ${commonAttrs}/><circle cx="10" cy="5" r="3" ${commonAttrs}/></svg>`,
    // Smoke: Cloud Fog
    smoke: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" ${commonAttrs}/><path d="M16 17H7" ${commonAttrs}/><path d="M17 21H9" ${commonAttrs}/></svg>`,
    // Button: Toggle Right / Radio
    button: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" ${commonAttrs}/><circle cx="12" cy="12" r="4" ${commonAttrs}/></svg>`,
    // Plug: Plug
    plug: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22v-5" ${commonAttrs}/><path d="M9 8V2" ${commonAttrs}/><path d="M15 8V2" ${commonAttrs}/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8h12Z" ${commonAttrs}/></svg>`,
  }
};

const baseDir = path.join(process.cwd(), 'src/assets/icons');

Object.entries(icons).forEach(([category, items]) => {
  const dir = path.join(baseDir, category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  Object.entries(items).forEach(([name, content]) => {
    fs.writeFileSync(path.join(dir, `${name}.svg`), content);
    console.log(`Generated ${category}/${name}.svg`);
  });
});
