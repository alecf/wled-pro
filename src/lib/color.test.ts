import { describe, expect, it } from 'vitest'
import { hexToRgb, includesColor, rgbToHex } from './color'

describe('color', () => {
  it('converts between RGB and hex', () => {
    expect(rgbToHex([255, 160, 0])).toBe('#ffa000')
    expect(rgbToHex([0, 5, 16])).toBe('#000510')
    expect(hexToRgb('#ffa000')).toEqual([255, 160, 0])
    expect(hexToRgb('00FF10')).toEqual([0, 255, 16])
  })

  it('rejects strings that are not #rrggbb', () => {
    expect(hexToRgb('#fff')).toBeNull()
    expect(hexToRgb('red')).toBeNull()
  })

  it('finds a color in a list', () => {
    expect(includesColor([[1, 2, 3]], [1, 2, 3])).toBe(true)
    expect(includesColor([[1, 2, 3]], [1, 2, 4])).toBe(false)
  })
})
