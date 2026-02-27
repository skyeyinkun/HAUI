export interface Region {
  code: string;
  name: string;
  children?: Region[];
  lat?: number;
  lon?: number;
}

// 默认地区：重庆市南岸区
export const DEFAULT_REGION: { province: Region; city: Region; district: Region } = {
  province: { code: '500000', name: '重庆市' },
  city: { code: '500100', name: '重庆市' },
  district: { code: '500108', name: '南岸区', lat: 29.5215, lon: 106.5635 },
};
