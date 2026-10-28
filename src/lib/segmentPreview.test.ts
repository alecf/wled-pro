import { describe, expect, it } from 'vitest'
import { parseEffectMetadata } from '@/lib/effects'
import { paletteGradient, segmentPreviewBackground, showSwatchColors } from '@/lib/segmentPreview'

const solid = parseEffectMetadata('', 0, 'Solid')
const blink = parseEffectMetadata('!,Duty cycle;!,!;!;01', 1, 'Blink')
const rainbow = parseEffectMetadata('!,Size;;!', 9, 'Rainbow')

const palettes = [
  {
    id: 0,
    name: 'Default',
    colors: [
      [0, 255, 0, 0],
      [255, 0, 0, 255],
    ] as [number, number, number, number][],
  },
  { id: 3, name: '* Colors 1&2', colors: ['c1', 'c2'] },
  { id: 1, name: '* Random Cycle', colors: ['r', 'r'] },
]

describe('paletteGradient', () => {
  it('draws gradient stops at their positions', () => {
    expect(paletteGradient(palettes[0].colors)).toBe(
      'linear-gradient(to right, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)',
    )
  })

  it('resolves dynamic palettes from the segment colors', () => {
    expect(paletteGradient(['c1', 'c2'], [[255, 0, 0], [0, 255, 0], null])).toBe(
      'linear-gradient(to right, rgb(255, 0, 0) 0%, rgb(0, 255, 0) 100%)',
    )
  })

  it('returns null when there is nothing to draw', () => {
    expect(paletteGradient(['r', 'r'], [[255, 0, 0]])).toBeNull()
    expect(paletteGradient([])).toBeNull()
  })
})

describe('segmentPreviewBackground', () => {
  const col: [number, number, number][] = [
    [255, 120, 0],
    [0, 0, 255],
    [0, 0, 0],
  ]

  it('fills Solid with its color', () => {
    expect(segmentPreviewBackground({ col, pal: 0 }, solid, palettes)).toBe('rgb(255, 120, 0)')
  })

  it('uses the palette for palette effects', () => {
    expect(segmentPreviewBackground({ col, pal: 0 }, rainbow, palettes)).toContain(
      'rgb(255, 0, 0) 0%',
    )
    expect(segmentPreviewBackground({ col, pal: 3 }, rainbow, palettes)).toBe(
      'linear-gradient(to right, rgb(255, 120, 0) 0%, rgb(0, 0, 255) 100%)',
    )
  })

  it('uses the colors with the Default palette when the effect has colors', () => {
    expect(segmentPreviewBackground({ col, pal: 0 }, blink, palettes)).toBe(
      'linear-gradient(to right, rgb(255, 120, 0) 0%, rgb(0, 0, 255) 100%)',
    )
  })

  it("falls back to the effect's colors when the palette can't be drawn", () => {
    // Blink uses a palette too, but a random one can't be drawn
    expect(segmentPreviewBackground({ col, pal: 1 }, blink, palettes)).toBe(
      'linear-gradient(to right, rgb(255, 120, 0) 0%, rgb(0, 0, 255) 100%)',
    )
  })

  it('uses color 1 without effect metadata, and null without colors', () => {
    expect(segmentPreviewBackground({ col }, undefined)).toBe('rgb(255, 120, 0)')
    expect(segmentPreviewBackground({}, solid)).toBeNull()
  })
})

describe('showSwatchColors', () => {
  it('takes the first three non-black colors across segments', () => {
    expect(
      showSwatchColors([
        {
          col: [
            [255, 0, 0],
            [0, 0, 0],
            [0, 0, 255],
          ],
        },
        {
          col: [
            [0, 255, 0],
            [1, 2, 3],
          ],
        },
      ]),
    ).toEqual(['rgb(255, 0, 0)', 'rgb(0, 0, 255)', 'rgb(0, 255, 0)'])
  })

  it('is empty for black or missing colors', () => {
    expect(showSwatchColors([{ col: [[0, 0, 0]] }, { col: [] }])).toEqual([])
  })
})
