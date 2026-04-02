import climate_co2 from './climate/co2.svg';
import climate_hcho from './climate/hcho.svg';
import climate_heat from './climate/heat.svg';
import climate_humidity from './climate/humidity.svg';
import climate_light from './climate/light.svg';
import climate_noise from './climate/noise.svg';
import climate_pm25 from './climate/pm25.svg';
import climate_pressure from './climate/pressure.svg';
import climate_temp from './climate/temp.svg';
import climate_tvoc from './climate/tvoc.svg';
import climate_voc from './climate/voc.svg';
import climate_wind from './climate/wind.svg';
import sensor_alert from './sensor/alert.svg';
import sensor_battery from './sensor/battery.svg';
import sensor_button from './sensor/button.svg';
import sensor_door from './sensor/door.svg';
import sensor_gas from './sensor/gas.svg';
import sensor_motion from './sensor/motion.svg';
import sensor_plug from './sensor/plug.svg';
import sensor_plug_power from './sensor/plug_power.svg';
import sensor_presence from './sensor/presence.svg';
import sensor_smoke from './sensor/smoke.svg';
import sensor_water from './sensor/water.svg';
import sensor_wifi from './sensor/wifi.svg';

export const iconMap: Record<string, string> = {
  "co2": climate_co2,
  "hcho": climate_hcho,
  "heat": climate_heat,
  "humidity": climate_humidity,
  "light": climate_light,
  "noise": climate_noise,
  "pm25": climate_pm25,
  "pressure": climate_pressure,
  "temp": climate_temp,
  "tvoc": climate_tvoc,
  "voc": climate_voc,
  "wind": climate_wind,
  "alert": sensor_alert,
  "battery": sensor_battery,
  "button": sensor_button,
  "door": sensor_door,
  "gas": sensor_gas,
  "motion": sensor_motion,
  "plug": sensor_plug,
  "plug_power": sensor_plug_power,
  "presence": sensor_presence,
  "smoke": sensor_smoke,
  "water": sensor_water,
  "wifi": sensor_wifi,
};

export const iconsByCategory: Record<string, string[]> = {
  "climate": ["co2", "hcho", "heat", "humidity", "light", "noise", "pm25", "pressure", "temp", "tvoc", "voc", "wind"],
  "sensor": ["alert", "battery", "button", "door", "gas", "motion", "plug", "plug_power", "presence", "smoke", "water", "wifi"],
};

export const iconMeta: Array<{ name: string; category: string; keywords: string[] }> = [
  {
    "name": "co2",
    "category": "climate",
    "keywords": [
      "co2"
    ]
  },
  {
    "name": "hcho",
    "category": "climate",
    "keywords": [
      "hcho"
    ]
  },
  {
    "name": "heat",
    "category": "climate",
    "keywords": [
      "heat"
    ]
  },
  {
    "name": "humidity",
    "category": "climate",
    "keywords": [
      "humidity"
    ]
  },
  {
    "name": "light",
    "category": "climate",
    "keywords": [
      "light"
    ]
  },
  {
    "name": "noise",
    "category": "climate",
    "keywords": [
      "noise"
    ]
  },
  {
    "name": "pm25",
    "category": "climate",
    "keywords": [
      "pm25"
    ]
  },
  {
    "name": "pressure",
    "category": "climate",
    "keywords": [
      "pressure"
    ]
  },
  {
    "name": "temp",
    "category": "climate",
    "keywords": [
      "temp"
    ]
  },
  {
    "name": "tvoc",
    "category": "climate",
    "keywords": [
      "tvoc"
    ]
  },
  {
    "name": "voc",
    "category": "climate",
    "keywords": [
      "voc"
    ]
  },
  {
    "name": "wind",
    "category": "climate",
    "keywords": [
      "wind"
    ]
  },
  {
    "name": "alert",
    "category": "sensor",
    "keywords": [
      "alert"
    ]
  },
  {
    "name": "battery",
    "category": "sensor",
    "keywords": [
      "battery"
    ]
  },
  {
    "name": "button",
    "category": "sensor",
    "keywords": [
      "button"
    ]
  },
  {
    "name": "door",
    "category": "sensor",
    "keywords": [
      "door"
    ]
  },
  {
    "name": "gas",
    "category": "sensor",
    "keywords": [
      "gas"
    ]
  },
  {
    "name": "motion",
    "category": "sensor",
    "keywords": [
      "motion"
    ]
  },
  {
    "name": "plug",
    "category": "sensor",
    "keywords": [
      "plug"
    ]
  },
  {
    "name": "plug_power",
    "category": "sensor",
    "keywords": [
      "plug",
      "power"
    ]
  },
  {
    "name": "presence",
    "category": "sensor",
    "keywords": [
      "presence"
    ]
  },
  {
    "name": "smoke",
    "category": "sensor",
    "keywords": [
      "smoke"
    ]
  },
  {
    "name": "water",
    "category": "sensor",
    "keywords": [
      "water"
    ]
  },
  {
    "name": "wifi",
    "category": "sensor",
    "keywords": [
      "wifi"
    ]
  }
];

export const getIconUrl = (name: string) => {
  if (!name) return null;
  return iconMap[name] || null;
};
