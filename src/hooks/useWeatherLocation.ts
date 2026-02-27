import { useState, useEffect } from 'react';
import { locationService } from '../services/LocationService';
import { DEFAULT_REGION, Region } from '../utils/regions';
import { Log } from '../types/dashboard';

export interface WeatherLocationState {
  lat: number;
  lon: number;
  isFallback: boolean;
}

export function useWeatherLocation(selectedRegion: { province: Region; city: Region; district: Region } | undefined, setLogs: React.Dispatch<React.SetStateAction<Log[]>>) {
  const [weatherCoords, setWeatherCoords] = useState<WeatherLocationState>(() => ({
    lat: DEFAULT_REGION.district.lat,
    lon: DEFAULT_REGION.district.lon,
    isFallback: false,
  }));

  const isDefaultRegion = selectedRegion?.district?.code === DEFAULT_REGION.district.code;

  useEffect(() => {
    const districtLat = selectedRegion?.district?.lat;
    const districtLon = selectedRegion?.district?.lon;
    const districtCode = selectedRegion?.district?.code;

    // 1. 如果是默认地区，直接使用默认坐标
    if (isDefaultRegion) {
      setWeatherCoords({
        lat: DEFAULT_REGION.district.lat,
        lon: DEFAULT_REGION.district.lon,
        isFallback: false,
      });
      return;
    }

    // 2. 如果选中地区已有坐标，直接使用
    if (districtLat != null && districtLon != null) {
      setWeatherCoords({ lat: districtLat, lon: districtLon, isFallback: false });
      return;
    }

    // 3. 如果选中了非默认地区但无坐标，先切到fallback模式（使用默认坐标但标记为fallback）
    if (!districtCode) return;

    setWeatherCoords({
      lat: DEFAULT_REGION.district.lat,
      lon: DEFAULT_REGION.district.lon,
      isFallback: true,
    });

    const provinceName = selectedRegion?.province?.name;
    const cityName = selectedRegion?.city?.name;
    const districtName = selectedRegion?.district?.name;
    if (!provinceName || !cityName || !districtName) return;

    // 4. 后台解析坐标
    let cancelled = false;
    (async () => {
      const result = await locationService.resolveCoordinates({ provinceName, cityName, districtName });
      if (cancelled) return;

      if (result?.coords) {
        setWeatherCoords({ lat: result.coords.lat, lon: result.coords.lon, isFallback: false });
        // 注意：这里我们不再修改 selectedRegion，而是只更新 weatherCoords
        // 这样解耦了 UI 状态和天气状态。
        // 如果需要同步回 selectedRegion，应该由调用者处理，或者通过 callback
        // 但为了保持 hook 纯粹，我们这里只负责 weatherCoords
        
        // 记录日志
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        setLogs(prev => [{
          time,
          message: `地理位置已同步：${cityName}·${districtName} (${result.resolution})`
        }, ...prev].slice(0,50));
      } else {
        const now = new Date();
        const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        setLogs(prev => [{
          time,
          message: `地理位置同步失败：${cityName}·${districtName}（将使用默认天气位置）`
        }, ...prev].slice(0,50));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    isDefaultRegion,
    selectedRegion?.province?.name,
    selectedRegion?.city?.name,
    selectedRegion?.district?.name,
    selectedRegion?.district?.code,
    selectedRegion?.district?.lat,
    selectedRegion?.district?.lon,
  ]);

  return weatherCoords;
}
