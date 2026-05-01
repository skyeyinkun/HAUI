export interface Region {
  code: string;
  name: string;
  children?: Region[];
  lat?: number;
  lon?: number;
}

// 默认地区：北京市东城区（使用公共地标坐标，避免暴露开发者个人住址）
export const DEFAULT_REGION: { province: Region; city: Region; district: Region } = {
  province: { code: '110000', name: '北京市' },
  city: { code: '110100', name: '北京市' },
  district: { code: '110101', name: '东城区', lat: 39.9042, lon: 116.4074 },
};
