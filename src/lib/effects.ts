import type { WledEffectData } from '@/types/wled'

/**
 * Parsed effect with all metadata in a developer-friendly format
 */
export interface Effect {
  id: number
  name: string
  parameters: EffectParameter[]
  colors: EffectColorSlot[]
  usesPalette: boolean
  flags: EffectFlags
}

export interface EffectParameter {
  /** Parameter key used in API calls (sx, ix, c1, c2, c3, o1, o2, o3) */
  key: string
  /** Display label for UI */
  name: string
  /** Parameter type */
  type: 'slider' | 'checkbox'
  /** Minimum value (sliders only) */
  min?: number
  /** Maximum value (sliders only) */
  max?: number
  /** Default value if specified in effect metadata */
  default?: number | boolean
}

export interface EffectColorSlot {
  /** Color slot index (0, 1, 2) */
  index: number
  /** Display label for UI */
  name: string
}

export interface EffectFlags {
  /** Optimized for 1D LED strips */
  supports1D: boolean
  /** Requires/supports 2D matrix setup */
  supports2D: boolean
  /** Audio reactive - responds to volume/amplitude */
  volumeReactive: boolean
  /** Audio reactive - responds to frequency distribution */
  frequencyReactive: boolean
}

/** Default labels for slider parameters */
const DEFAULT_SLIDER_LABELS: Record<string, string> = {
  sx: 'Speed',
  ix: 'Intensity',
  c1: 'Custom 1',
  c2: 'Custom 2',
  c3: 'Custom 3',
}

/** Default labels for checkbox parameters */
const DEFAULT_CHECKBOX_LABELS: Record<string, string> = {
  o1: 'Option 1',
  o2: 'Option 2',
  o3: 'Option 3',
}

/** Default labels for color slots */
const DEFAULT_COLOR_LABELS = ['Fx', 'Bg', 'Cs']

/** Parameter keys in order they appear in fxdata */
const SLIDER_KEYS = ['sx', 'ix', 'c1', 'c2', 'c3']
const CHECKBOX_KEYS = ['o1', 'o2', 'o3']

/**
 * Parse defaults string like "sx=24,pal=50,c1=8" into a map
 */
function parseDefaults(defaultsStr: string): Record<string, number> {
  const defaults: Record<string, number> = {}
  if (!defaultsStr) return defaults

  for (const pair of defaultsStr.split(',')) {
    const [key, value] = pair.split('=')
    if (key && value !== undefined) {
      defaults[key.trim()] = parseInt(value.trim(), 10)
    }
  }
  return defaults
}

/**
 * Parse flags string like "12vf" into structured flags
 */
function parseFlags(flagsStr: string): EffectFlags {
  return {
    supports1D: flagsStr.includes('1') || flagsStr.includes('0'),
    supports2D: flagsStr.includes('2'),
    volumeReactive: flagsStr.includes('v'),
    frequencyReactive: flagsStr.includes('f'),
  }
}

/**
 * Parse effect parameters section like "!,Duty cycle,,,,,Overlay"
 * Returns array of up to 8 parameters (5 sliders + 3 checkboxes)
 */
function parseParameters(
  paramsStr: string,
  defaults: Record<string, number>
): EffectParameter[] {
  const parameters: EffectParameter[] = []
  const parts = paramsStr.split(',')

  // Parse sliders (first 5)
  for (let i = 0; i < SLIDER_KEYS.length; i++) {
    const key = SLIDER_KEYS[i]
    const label = parts[i]?.trim()

    // Empty label means parameter is hidden/disabled
    if (label === undefined || label === '') continue

    const name = label === '!' ? DEFAULT_SLIDER_LABELS[key] : label
    const param: EffectParameter = {
      key,
      name,
      type: 'slider',
      min: 0,
      max: 255,
    }

    // Add default if specified
    if (defaults[key] !== undefined) {
      param.default = defaults[key]
    }

    parameters.push(param)
  }

  // Parse checkboxes (next 3)
  for (let i = 0; i < CHECKBOX_KEYS.length; i++) {
    const key = CHECKBOX_KEYS[i]
    const label = parts[5 + i]?.trim()

    // Empty label means parameter is hidden/disabled
    if (label === undefined || label === '') continue

    const name = label === '!' ? DEFAULT_CHECKBOX_LABELS[key] : label
    const param: EffectParameter = {
      key,
      name,
      type: 'checkbox',
    }

    // Add default if specified (checkboxes use boolean)
    if (defaults[key] !== undefined) {
      param.default = defaults[key] !== 0
    }

    parameters.push(param)
  }

  return parameters
}

/**
 * Parse colors section like "!,!,Gradient" or "Fx,Bg"
 */
function parseColors(colorsStr: string): EffectColorSlot[] {
  const colors: EffectColorSlot[] = []
  if (!colorsStr) return colors

  const parts = colorsStr.split(',')
  for (let i = 0; i < parts.length && i < 3; i++) {
    const label = parts[i]?.trim()

    // Empty label means color slot is hidden
    if (label === undefined || label === '') continue

    const name = label === '!' ? DEFAULT_COLOR_LABELS[i] : label
    colors.push({ index: i, name })
  }

  return colors
}

/**
 * Parse a single effect metadata string into structured data
 *
 * Format: "<parameters>;<colors>;<palette>;<flags>;<defaults>"
 *
 * @param fxdata The raw metadata string from /json/fxdata
 * @param id Effect ID (array index)
 * @param name Effect name from /json/eff
 */
export function parseEffectMetadata(
  fxdata: string,
  id: number,
  name: string
): Effect {
  // Split into sections (some may be empty)
  const sections = fxdata.split(';')
  const [paramsStr = '', colorsStr = '', paletteStr = '', flagsStr = '', defaultsStr = ''] =
    sections

  // Parse defaults first so we can use them in parameters
  const defaults = parseDefaults(defaultsStr)

  return {
    id,
    name,
    parameters: parseParameters(paramsStr, defaults),
    colors: parseColors(colorsStr),
    usesPalette: paletteStr === '!',
    flags: parseFlags(flagsStr),
  }
}

/**
 * Combine effect names and metadata arrays into parsed Effect objects
 */
export function parseEffects(names: string[], fxdata: WledEffectData): Effect[] {
  const effects: Effect[] = []

  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const metadata = fxdata[i] ?? ''

    // Skip empty effect names (shouldn't happen but be safe)
    if (!name) continue

    effects.push(parseEffectMetadata(metadata, i, name))
  }

  return effects
}
