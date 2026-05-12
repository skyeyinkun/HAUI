import { expect, vi } from "vitest"
import * as matchers from "@testing-library/jest-dom/matchers"

expect.extend(matchers)

const localStorageMock = (() => {
  let store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    getItem: vi.fn((key: string) => store.get(String(key)) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(String(key), String(value))
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(String(key))
    }),
    clear: vi.fn(() => {
      store = new Map()
    }),
  }
})()

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
})

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
})

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

(globalThis as any).ResizeObserver =
  (globalThis as any).ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

if (!(globalThis as any).Worker) {
  (globalThis as any).Worker = class WorkerMock {
    onmessage: ((e: MessageEvent) => void) | null = null
    onerror: ((e: ErrorEvent) => void) | null = null
    constructor(_url?: any, _options?: any) {}
    postMessage(_message: any) {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return false
    }
  }
}
