import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocationService } from '@/services/LocationService'

const mockResults = {
  '南岸区': [{ name: '南岸区', latitude: 29.54111, longitude: 106.58778, country_code: 'CN', admin1: '重庆市', admin2: '重庆市' }],
  '重庆市': [{ name: '重庆市', latitude: 29.56026, longitude: 106.55771, country_code: 'CN', admin1: '重庆市', admin2: '重庆市' }],
  '北京市': [{ name: '北京市', latitude: 39.9042, longitude: 116.4074, country_code: 'CN', admin1: '北京市', admin2: '北京市' }],
  '朝阳区': [{ name: '朝阳区', latitude: 39.91812, longitude: 116.43242, country_code: 'CN', admin1: '北京', admin2: '北京市' }],
  '北京市朝阳区': [{ name: '朝阳区', latitude: 39.91812, longitude: 116.43242, country_code: 'CN', admin1: '北京市', admin2: '北京市' }],
}

describe('LocationService', () => {
  let service: LocationService

  beforeEach(() => {
    const fetcher = (url: string) => {
      const u = new URL(url)
      const q = u.searchParams.get('name') || ''
      const key = decodeURIComponent(q)
      const res = mockResults[key] || []
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: res }),
      } as any)
    }
    service = new LocationService(fetcher as any)
  })

  it('resolves district coordinates with admin match', async () => {
    const result = await service.resolveCoordinates({
      provinceName: '重庆市',
      cityName: '重庆市',
      districtName: '南岸区',
    })
    expect(result).not.toBeNull()
    expect(result!.resolution).toBe('district')
    expect(result!.coords.lat).toBeCloseTo(29.54111, 2)
    expect(result!.durationMs).toBeLessThanOrEqual(500)
  })

  it('falls back to city when district not found', async () => {
    const result = await service.resolveCoordinates({
      provinceName: '重庆市',
      cityName: '重庆市',
      districtName: '不存在的区',
    })
    expect(result).not.toBeNull()
    expect(['city', 'province']).toContain(result!.resolution)
  })

  it('uses combined query to improve district matching', async () => {
    const fetcher = (url: string) => {
      const u = new URL(url)
      const q = u.searchParams.get('name') || ''
      const key = decodeURIComponent(q)
      if (key === '朝阳区') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) } as any)
      }
      const res = mockResults[key as keyof typeof mockResults] || []
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: res }),
      } as any)
    }

    service = new LocationService(fetcher as any)
    const result = await service.resolveCoordinates({
      provinceName: '北京市',
      cityName: '北京市',
      districtName: '朝阳区',
    })
    expect(result).not.toBeNull()
    expect(result!.resolution).toBe('district')
    expect(result!.coords.lat).toBeCloseTo(39.91812, 2)
    expect(result!.coords.lon).toBeCloseTo(116.43242, 2)
  })

  it('handles responses without results field', async () => {
    const fetcher = (url: string) => {
      const u = new URL(url)
      const q = decodeURIComponent(u.searchParams.get('name') || '')
      if (q === '不存在的区') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ generationtime_ms: 0.1 }) } as any)
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ results: mockResults[q as keyof typeof mockResults] || [] }),
      } as any)
    }
    service = new LocationService(fetcher as any)
    const result = await service.resolveCoordinates({
      provinceName: '重庆市',
      cityName: '重庆市',
      districtName: '不存在的区',
    })
    expect(result).not.toBeNull()
  })

  it('getCoordinates caches results', async () => {
    const coords1 = await service.getCoordinates('南岸区')
    const coords2 = await service.getCoordinates('南岸区')
    expect(coords1).not.toBeNull()
    expect(coords2).not.toBeNull()
    expect(coords1!.lat).toBeCloseTo(coords2!.lat, 6)
  })
})
