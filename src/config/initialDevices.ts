import { Device } from "@/types/device";

export const INITIAL_DEVICES: Device[] = [
  {
    id: 1,
    name: "客厅空调",
    icon: "wind", // Mapped to Wind icon in DeviceCard, typically used for AC
    count: "1",
    power: "1000W",
    isOn: true,
    room: "客厅",
    type: "ac",
    isCommon: true,
    temperature: 24,
    current_temperature: 26,
    mode: "cool",
    fan_mode: "auto",
    swing_mode: "off"
  },
  {
    id: 2,
    name: "主卧吊灯",
    icon: "lamp",
    count: "1",
    power: "50W",
    isOn: true,
    room: "主卧",
    type: "light",
    isCommon: true,
    brightness: 80,
    color_temp: 300 // Mireds (approx 3300K)
  },
  {
    id: 3,
    name: "客厅窗帘",
    icon: "curtain",
    count: "1",
    power: "",
    isOn: false,
    room: "客厅",
    type: "curtain",
    isCommon: true,
    position: 0
  },
  {
    id: 4,
    name: "玄关人体传感器",
    icon: "motion",
    count: "",
    power: "",
    isOn: false,
    room: "过道",
    type: "sensor",
    isCommon: true
  },
  {
    id: 5,
    name: "客厅电视遥控",
    icon: "remote",
    count: "",
    power: "",
    isOn: false,
    room: "客厅",
    type: "remote",
    isCommon: true
  }
];
