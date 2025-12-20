import { describe, it, expect } from 'vitest'
import { parseEffectMetadata, parseEffects } from './effects'

describe('parseEffectMetadata', () => {
  it('parses empty metadata (Solid effect)', () => {
    const effect = parseEffectMetadata('', 0, 'Solid')

    expect(effect.id).toBe(0)
    expect(effect.name).toBe('Solid')
    expect(effect.parameters).toEqual([])
    expect(effect.colors).toEqual([])
    expect(effect.usesPalette).toBe(false)
    expect(effect.flags).toEqual({
      supports1D: false,
      supports2D: false,
      volumeReactive: false,
      frequencyReactive: false,
    })
  })

  it('parses Blink effect with default labels', () => {
    const effect = parseEffectMetadata('!,Duty cycle;!,!;!;01', 1, 'Blink')

    expect(effect.id).toBe(1)
    expect(effect.name).toBe('Blink')
    expect(effect.parameters).toHaveLength(2)
    expect(effect.parameters[0]).toEqual({
      key: 'sx',
      name: 'Speed',
      type: 'slider',
      min: 0,
      max: 255,
    })
    expect(effect.parameters[1]).toEqual({
      key: 'ix',
      name: 'Duty cycle',
      type: 'slider',
      min: 0,
      max: 255,
    })
    expect(effect.colors).toEqual([
      { index: 0, name: 'Fx' },
      { index: 1, name: 'Bg' },
    ])
    expect(effect.usesPalette).toBe(true)
    expect(effect.flags.supports1D).toBe(true)
  })

  it('parses effect with checkbox parameters', () => {
    const effect = parseEffectMetadata('!,# of dots,,,,,Overlay;!,!,!;!', 10, 'Scan')

    expect(effect.parameters).toContainEqual({
      key: 'sx',
      name: 'Speed',
      type: 'slider',
      min: 0,
      max: 255,
    })
    expect(effect.parameters).toContainEqual({
      key: 'ix',
      name: '# of dots',
      type: 'slider',
      min: 0,
      max: 255,
    })
    expect(effect.parameters).toContainEqual({
      key: 'o2',
      name: 'Overlay',
      type: 'checkbox',
    })
    expect(effect.colors).toHaveLength(3)
  })

  it('parses effect with defaults', () => {
    const effect = parseEffectMetadata('!,!;!,!;!;;sx=64,ix=128', 50, 'TestEffect')

    expect(effect.parameters[0]).toMatchObject({
      key: 'sx',
      name: 'Speed',
      default: 64,
    })
    expect(effect.parameters[1]).toMatchObject({
      key: 'ix',
      name: 'Intensity',
      default: 128,
    })
  })

  it('parses 2D effect flags', () => {
    const effect = parseEffectMetadata('!,Blur;;!;2', 118, 'Blur2D')

    expect(effect.flags).toEqual({
      supports1D: false,
      supports2D: true,
      volumeReactive: false,
      frequencyReactive: false,
    })
  })

  it('parses combined 1D+2D flags', () => {
    const effect = parseEffectMetadata('!,!;!,!;!;12', 50, 'Both')

    expect(effect.flags.supports1D).toBe(true)
    expect(effect.flags.supports2D).toBe(true)
  })

  it('parses audio reactive flags', () => {
    const effect = parseEffectMetadata('!,!;!;!;1v', 80, 'VolumeReactive')
    expect(effect.flags.supports1D).toBe(true)
    expect(effect.flags.volumeReactive).toBe(true)
    expect(effect.flags.frequencyReactive).toBe(false)

    const freqEffect = parseEffectMetadata('!,!;!;!;2f', 81, 'FrequencyReactive')
    expect(freqEffect.flags.supports2D).toBe(true)
    expect(freqEffect.flags.frequencyReactive).toBe(true)
  })

  it('parses complex 2D effect with many parameters', () => {
    const metadata =
      '!,Y Offset,Trail,Font size,Rotate,Gradient,Overlay,Reverse;!,!,Gradient;!;2;ix=128,c1=0'
    const effect = parseEffectMetadata(metadata, 122, 'Scrolling Text')

    // Should have 5 sliders + 3 checkboxes
    const sliders = effect.parameters.filter((p) => p.type === 'slider')
    const checkboxes = effect.parameters.filter((p) => p.type === 'checkbox')

    expect(sliders).toHaveLength(5)
    expect(checkboxes).toHaveLength(3)

    expect(sliders[0]).toMatchObject({ key: 'sx', name: 'Speed' })
    expect(sliders[1]).toMatchObject({ key: 'ix', name: 'Y Offset', default: 128 })
    expect(sliders[2]).toMatchObject({ key: 'c1', name: 'Trail', default: 0 })
    expect(sliders[3]).toMatchObject({ key: 'c2', name: 'Font size' })
    expect(sliders[4]).toMatchObject({ key: 'c3', name: 'Rotate' })

    expect(checkboxes[0]).toMatchObject({ key: 'o1', name: 'Gradient' })
    expect(checkboxes[1]).toMatchObject({ key: 'o2', name: 'Overlay' })
    expect(checkboxes[2]).toMatchObject({ key: 'o3', name: 'Reverse' })

    expect(effect.colors).toHaveLength(3)
    expect(effect.colors[2]).toEqual({ index: 2, name: 'Gradient' })
  })

  it('handles custom color labels', () => {
    const effect = parseEffectMetadata('!;L,!,R;!', 52, 'Tricolor')

    expect(effect.colors).toEqual([
      { index: 0, name: 'L' },
      { index: 1, name: 'Bg' },
      { index: 2, name: 'R' },
    ])
  })

  it('handles missing palette section', () => {
    const effect = parseEffectMetadata('!,Blur;;;2', 119, 'NoPalette')

    expect(effect.usesPalette).toBe(false)
  })
})

describe('parseEffects', () => {
  it('combines names and fxdata arrays', () => {
    const names = ['Solid', 'Blink', 'Breathe']
    const fxdata = ['', '!,Duty cycle;!,!;!;01', '!;!,!;!;01']

    const effects = parseEffects(names, fxdata)

    expect(effects).toHaveLength(3)
    expect(effects[0].name).toBe('Solid')
    expect(effects[0].id).toBe(0)
    expect(effects[1].name).toBe('Blink')
    expect(effects[1].id).toBe(1)
    expect(effects[2].name).toBe('Breathe')
    expect(effects[2].id).toBe(2)
  })

  it('handles mismatched array lengths gracefully', () => {
    const names = ['Solid', 'Blink', 'Breathe']
    const fxdata = [''] // Only one metadata entry

    const effects = parseEffects(names, fxdata)

    expect(effects).toHaveLength(3)
    expect(effects[0].parameters).toEqual([])
    expect(effects[1].parameters).toEqual([]) // Uses empty string as default
    expect(effects[2].parameters).toEqual([])
  })

  it('skips empty effect names', () => {
    const names = ['Solid', '', 'Breathe']
    const fxdata = ['', '', '!;!,!;!;01']

    const effects = parseEffects(names, fxdata)

    expect(effects).toHaveLength(2)
    expect(effects[0].name).toBe('Solid')
    expect(effects[0].id).toBe(0)
    expect(effects[1].name).toBe('Breathe')
    expect(effects[1].id).toBe(2)
  })
})
