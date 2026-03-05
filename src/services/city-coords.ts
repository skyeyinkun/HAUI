/**
 * 城市坐标查询服务
 * 根据行政区划代码查询对应的城市坐标
 * 区县继承所属地级市坐标（Open-Meteo 天气 API 分辨率 ~28km，同城天气基本一致）
 */

export interface CityCoords {
    lat: number;
    lon: number;
}

let coordsCache: Record<string, CityCoords> | null = null;
let loadingPromise: Promise<Record<string, CityCoords>> | null = null;

/**
 * 加载城市坐标数据（懒加载，首次调用时从 JSON 文件加载）
 */
async function loadCoordsData(): Promise<Record<string, CityCoords>> {
    if (coordsCache) return coordsCache;
    if (loadingPromise) return loadingPromise;

    loadingPromise = fetch('./data/city-coords.json')
        .then(res => {
            if (!res.ok) throw new Error(`Failed to load city-coords.json: ${res.status}`);
            return res.json();
        })
        .then(data => {
            coordsCache = data;
            return data;
        })
        .catch(err => {
            console.error('[CityCoords] Failed to load:', err);
            loadingPromise = null; // Allow retry
            return {};
        });

    return loadingPromise;
}

/**
 * 根据行政区划代码获取城市坐标
 * 查询逻辑：先精确匹配前4位（地级市），找不到则用前2位匹配省份
 * 
 * @param districtCode 6位行政区划代码，如 "500108"（重庆市南岸区）
 * @returns 城市坐标或 null
 */
export async function getCityCoords(districtCode: string): Promise<CityCoords | null> {
    if (!districtCode || districtCode.length < 4) return null;

    const data = await loadCoordsData();

    // 1. 精确匹配前4位（地级市代码）
    const cityCode = districtCode.substring(0, 4);
    if (data[cityCode]) {
        return data[cityCode];
    }

    // 2. 尝试完整6位代码（用于某些特殊区域）
    if (data[districtCode]) {
        return data[districtCode];
    }

    // 3. 尝试前2位+00（省级，如直辖市）
    const provinceCode = districtCode.substring(0, 2) + '00';
    if (data[provinceCode]) {
        return data[provinceCode];
    }

    return null;
}

/**
 * 同步版本：根据已加载的数据查询坐标（仅在数据已加载后使用）
 */
export function getCityCoordsSync(districtCode: string): CityCoords | null {
    if (!coordsCache || !districtCode || districtCode.length < 4) return null;

    const cityCode = districtCode.substring(0, 4);
    return coordsCache[cityCode] || coordsCache[districtCode] || coordsCache[districtCode.substring(0, 2) + '00'] || null;
}

/**
 * 预加载坐标数据（建议在应用启动时调用）
 */
export function preloadCityCoords(): void {
    loadCoordsData();
}
