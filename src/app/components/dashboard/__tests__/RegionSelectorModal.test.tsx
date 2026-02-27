// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

vi.mock('@/app/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/app/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

vi.mock('@/app/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/services/LocationService', () => ({
  locationService: {
    resolveCoordinates: vi.fn(),
  },
}))

import { locationService } from '@/services/LocationService'
import { RegionSelectorModal } from '@/app/components/dashboard/RegionSelectorModal'

describe('RegionSelectorModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', (url: string) => {
      if (url.includes('/data/level.json')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { code: '500000', name: '重庆市', province: '50', children: [] },
            ]),
        } as any)
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as any)
    })
  })
  afterEach(() => {
    cleanup()
  })

  it('closes and returns coords when geocoding succeeds', async () => {
    (locationService.resolveCoordinates as any).mockResolvedValue({
      coords: { lat: 29.54111, lon: 106.58778 },
      resolution: 'district',
      matchedQuery: '南岸区',
      durationMs: 12,
    })

    const onSelect = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <RegionSelectorModal
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        defaultRegion={{
          province: { code: '500000', name: '重庆市' } as any,
          city: { code: '500000', name: '重庆市' } as any,
          district: { code: '500108', name: '南岸区' } as any,
        }}
      />,
    )

    const confirm = await screen.findByTestId('region-confirm')
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(confirm)

    await waitFor(() => {
      expect(locationService.resolveCoordinates).toHaveBeenCalled()
      expect(onSelect).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
      const arg = onSelect.mock.calls[0][0]
      expect(arg.district.lat).toBeCloseTo(29.54111, 2)
      expect(arg.district.lon).toBeCloseTo(106.58778, 2)
    })
  })

  it('still saves and closes when geocoding fails', async () => {
    (locationService.resolveCoordinates as any).mockResolvedValue(null)

    const onSelect = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <RegionSelectorModal
        open={true}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        defaultRegion={{
          province: { code: '500000', name: '重庆市' } as any,
          city: { code: '500000', name: '重庆市' } as any,
          district: { code: '500108', name: '南岸区' } as any,
        }}
      />,
    )

    const confirm = await screen.findByTestId('region-confirm')
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(confirm)

    await waitFor(() => {
      expect(locationService.resolveCoordinates).toHaveBeenCalled()
      expect(onSelect).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
      const arg = onSelect.mock.calls[0][0]
      expect(arg.district.lat).toBeUndefined()
      expect(arg.district.lon).toBeUndefined()
    })
  })
})
