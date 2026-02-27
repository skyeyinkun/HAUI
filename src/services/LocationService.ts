export interface Coordinates {
  lat: number;
  lon: number;
}

export type CoordinateResolution = 'district' | 'city' | 'province';

export interface ResolveCoordinatesInput {
  provinceName: string;
  cityName: string;
  districtName: string;
}

export interface ResolveCoordinatesResult {
  coords: Coordinates;
  resolution: CoordinateResolution;
  matchedQuery: string;
  durationMs: number;
}

const COORDS_CACHE_KEY = 'region_coords_cache';
const STATS_KEY = '__weatherGeoStats__';
const GEO_TIMEOUT_MS = 6000;

export class LocationService {
  private cache: Record<string, Coordinates> = {};
  private inFlight: Map<string, Promise<Coordinates | null>> = new Map();
  private fetcher: typeof fetch;

  constructor(fetcher: typeof fetch = fetch) {
    this.loadCache();
    this.fetcher = fetcher;
  }

  private loadCache() {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(COORDS_CACHE_KEY);
      if (saved) this.cache = JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  private saveCache() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(COORDS_CACHE_KEY, JSON.stringify(this.cache));
    } catch {
      // ignore
    }
  }

  async getCoordinates(regionName: string, fallbackRegionName?: string): Promise<Coordinates | null> {
    const primary = regionName?.trim();
    const fallback = fallbackRegionName?.trim();
    if (!primary) return null;

    const cached = this.cache[primary];
    if (cached) return cached;

    const key = `q:${primary}`;
    if (this.inFlight.has(key)) return this.inFlight.get(key)!;

    const p = (async () => {
      try {
        const coords = await this.fetchBestCoordinates(primary);
        if (coords) {
          this.cache[primary] = coords;
          this.saveCache();
          return coords;
        }
      } catch (e) {
        console.warn(`Failed to fetch coords for ${primary}`, e);
      }

      if (fallback && fallback !== primary) {
        return this.getCoordinates(fallback);
      }

      return null;
    })();

    this.inFlight.set(key, p);
    try {
      return await p;
    } finally {
      this.inFlight.delete(key);
    }
  }

  async resolveCoordinates(input: ResolveCoordinatesInput): Promise<ResolveCoordinatesResult | null> {
    const started = performance.now();

    const districtQuery = normalizeName(input.districtName);
    const cityQuery = normalizeName(input.cityName);
    const provinceQuery = normalizeName(input.provinceName);

    const expectedAdmin1 = normalizeAdminName(input.provinceName);
    const expectedAdmin2 = normalizeAdminName(input.cityName);

    const districtQueries = [
      districtQuery,
      cityQuery && districtQuery ? `${cityQuery}${districtQuery}` : '',
      provinceQuery && cityQuery && districtQuery ? `${provinceQuery}${cityQuery}${districtQuery}` : '',
    ].filter(Boolean);

    const candidates = await Promise.allSettled([
      ...districtQueries.map((q) => this.fetchCandidates(q)),
      cityQuery ? this.fetchCandidates(cityQuery) : Promise.resolve([]),
      provinceQuery ? this.fetchCandidates(provinceQuery) : Promise.resolve([]),
    ]);

    const settled = candidates.map((c) => (c.status === 'fulfilled' ? c.value : []));
    const districtCandidates = settled.slice(0, districtQueries.length).flat();
    const cityCandidates = settled[districtQueries.length] ?? [];
    const provinceCandidates = settled[districtQueries.length + 1] ?? [];

    const bestDistrict = pickBestMatch(districtCandidates, {
      expectedName: districtQuery,
      expectedAdmin1,
      expectedAdmin2,
    });
    if (bestDistrict) {
      const durationMs = Math.round(performance.now() - started);
      this.recordStats({ ok: true, durationMs, resolution: 'district' });
      return {
        coords: { lat: bestDistrict.latitude, lon: bestDistrict.longitude },
        resolution: 'district',
        matchedQuery: districtQuery,
        durationMs,
      };
    }

    const bestCity = pickBestMatch(cityCandidates, {
      expectedName: cityQuery,
      expectedAdmin1,
      expectedAdmin2,
    });
    if (bestCity) {
      const durationMs = Math.round(performance.now() - started);
      this.recordStats({ ok: true, durationMs, resolution: 'city' });
      return {
        coords: { lat: bestCity.latitude, lon: bestCity.longitude },
        resolution: 'city',
        matchedQuery: cityQuery,
        durationMs,
      };
    }

    const bestProvince = pickBestMatch(provinceCandidates, {
      expectedName: provinceQuery,
      expectedAdmin1,
      expectedAdmin2,
    });
    if (bestProvince) {
      const durationMs = Math.round(performance.now() - started);
      this.recordStats({ ok: true, durationMs, resolution: 'province' });
      return {
        coords: { lat: bestProvince.latitude, lon: bestProvince.longitude },
        resolution: 'province',
        matchedQuery: provinceQuery,
        durationMs,
      };
    }

    const durationMs = Math.round(performance.now() - started);
    this.recordStats({ ok: false, durationMs, resolution: 'district' });
    return null;
  }

  private async fetchBestCoordinates(name: string): Promise<Coordinates | null> {
    const candidates = await this.fetchCandidates(name);
    const best = candidates?.[0];
    if (!best) return null;
    return { lat: best.latitude, lon: best.longitude };
  }

  private async fetchCandidates(name: string): Promise<any[]> {
    const trimmed = name.trim();
    if (!trimmed) return [];

    const cacheKey = `geo:${trimmed}`;
    const cached = this.cache[cacheKey as any] as any;
    if (cached && Array.isArray(cached)) return cached;

    try {
      const results = await this.fetchCandidatesOnce(trimmed, 'https');
      if (results.length > 0) {
        (this.cache as any)[cacheKey] = results;
        this.saveCache();
      }
      return results;
    } catch {
      const canUseHttpFallback =
        typeof window !== 'undefined' && typeof window.location?.protocol === 'string' && window.location.protocol === 'http:';
      if (!canUseHttpFallback) return [];

      try {
        const fallback = await this.fetchCandidatesOnce(trimmed, 'http');
        if (fallback.length > 0) {
          (this.cache as any)[cacheKey] = fallback;
          this.saveCache();
        }
        return fallback;
      } catch {
        return [];
      }
    }
  }

  private async fetchCandidatesOnce(name: string, protocol: 'https' | 'http'): Promise<any[]> {
    const url = `${protocol}://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=20&language=zh&format=json&country_code=CN`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    try {
      const response = await this.fetcher(url, { signal: controller.signal } as any);
      if (!response.ok) return [];
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results : [];
      return results;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private recordStats(entry: { ok: boolean; durationMs: number; resolution: CoordinateResolution }) {
    if (typeof window === 'undefined') return;
    try {
      const w = window as any;
      const stats = w[STATS_KEY] || { total: 0, ok: 0, p50: 0, p95: 0, durations: [], byResolution: {} };
      stats.total += 1;
      stats.ok += entry.ok ? 1 : 0;
      stats.byResolution[entry.resolution] = (stats.byResolution[entry.resolution] || 0) + 1;
      stats.durations.push(entry.durationMs);
      if (stats.durations.length > 200) stats.durations.shift();
      const sorted = [...stats.durations].sort((a: number, b: number) => a - b);
      const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * q)))];
      stats.p50 = p(0.5);
      stats.p95 = p(0.95);
      w[STATS_KEY] = stats;
    } catch {
      // ignore
    }
  }
}

export const locationService = new LocationService();

function normalizeName(text: string) {
  return String(text || '').trim();
}

function normalizeAdminName(text: string) {
  const t = normalizeName(text);
  return t
    .replace(/特别行政区$/g, '')
    .replace(/自治区$/g, '')
    .replace(/省$/g, '')
    .replace(/市$/g, '')
    .trim();
}

function normalizeComparable(text: string) {
  return normalizeName(text).replace(/\s+/g, '').trim();
}

function pickBestMatch(
  results: any[],
  ctx: { expectedName: string; expectedAdmin1: string; expectedAdmin2: string },
) {
  if (!Array.isArray(results) || results.length === 0) return null;

  const expectedName = normalizeComparable(ctx.expectedName);
  const expectedAdmin1 = normalizeAdminName(ctx.expectedAdmin1);
  const expectedAdmin2 = normalizeAdminName(ctx.expectedAdmin2);

  let best: any | null = null;
  let bestScore = -1;

  for (const r of results) {
    const rName = normalizeComparable(r?.name || '');
    const admin1 = normalizeAdminName(r?.admin1 || '');
    const admin2 = normalizeAdminName(r?.admin2 || '');

    let score = 0;
    if (r?.country_code === 'CN') score += 5;
    if (expectedName && rName === expectedName) score += 50;
    if (expectedAdmin1 && admin1 === expectedAdmin1) score += 30;
    if (expectedAdmin2 && admin2 === expectedAdmin2) score += 20;

    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }

  if (bestScore < 30) return null;
  return best;
}
