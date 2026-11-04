import { describe, expect, it } from 'vitest'
import { parseLiveBinary, parseLiveJson } from './liveLeds'

const L = 'L'.charCodeAt(0)

describe('parseLiveBinary', () => {
  it('reads a strip frame', () => {
    const frame = parseLiveBinary(new Uint8Array([L, 1, 255, 0, 0, 0, 0, 255]))
    expect(frame).toEqual({ rgb: new Uint8Array([255, 0, 0, 0, 0, 255]), width: 2, height: 1 })
  })

  it('reads a matrix frame with its size', () => {
    const pixels = Array.from({ length: 6 * 3 }, (_, i) => i)
    const frame = parseLiveBinary(new Uint8Array([L, 2, 3, 2, ...pixels]))
    expect(frame?.width).toBe(3)
    expect(frame?.height).toBe(2)
    expect(frame?.rgb).toHaveLength(18)
  })

  it('takes an ArrayBuffer and ignores a trailing partial pixel', () => {
    const frame = parseLiveBinary(new Uint8Array([L, 1, 1, 2, 3, 4]).buffer)
    expect(frame).toEqual({ rgb: new Uint8Array([1, 2, 3]), width: 1, height: 1 })
  })

  it('rejects other binary messages', () => {
    expect(parseLiveBinary(new Uint8Array([0, 1, 2, 3]))).toBeNull()
    expect(parseLiveBinary(new Uint8Array([L, 9, 2, 3]))).toBeNull()
    expect(parseLiveBinary(new Uint8Array([L, 2, 0, 0]))).toBeNull()
  })
})

describe('parseLiveJson', () => {
  it('reads hex colors', () => {
    const frame = parseLiveJson({ leds: ['FF0000', '00ff80'], n: 1 })
    expect(frame).toEqual({ rgb: new Uint8Array([255, 0, 0, 0, 255, 128]), width: 2, height: 1 })
  })

  it('reads a matrix', () => {
    const frame = parseLiveJson({ leds: ['000001', '000002', '000003', '000004'], w: 2, h: 2 })
    expect(frame?.width).toBe(2)
    expect(frame?.height).toBe(2)
  })

  it('leaves unreadable entries black and rejects other shapes', () => {
    expect(parseLiveJson({ leds: ['zz', 5] })?.rgb).toEqual(new Uint8Array(6))
    expect(parseLiveJson({ state: {} })).toBeNull()
    expect(parseLiveJson(null)).toBeNull()
  })
})
