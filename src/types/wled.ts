/**
 * WLED JSON API Types
 * Based on WLED JSON API: https://kno.wled.ge/interfaces/json-api/
 */

export interface WledState {
  on: boolean
  bri: number
  transition: number
  ps: number // preset ID
  pl: number // playlist ID
  nl: NightlightState
  udpn: UdpState
  lor: number // live override
  mainseg: number
  seg: Segment[]
}

export interface NightlightState {
  on: boolean
  dur: number
  mode: number
  tbri: number
  rem: number
}

export interface UdpState {
  send: boolean
  recv: boolean
  sgrp: number
  rgrp: number
}

export interface Segment {
  id: number
  start: number
  stop: number
  len: number
  grp: number
  spc: number
  of: number
  on: boolean
  frz: boolean
  bri: number
  cct: number
  col: [number, number, number][]
  fx: number
  sx: number
  ix: number
  pal: number
  c1: number
  c2: number
  c3: number
  sel: boolean
  rev: boolean
  mi: boolean
  n?: string // Optional segment name (WLED 0.13+)
}

export interface WledInfo {
  ver: string
  vid: number
  leds: LedInfo
  str: boolean
  name: string
  udpport: number
  live: boolean
  liveseg: number
  lm: string
  lip: string
  ws: number
  fxcount: number
  palcount: number
  cpalcount: number
  maps: number[]
  wifi: WifiInfo
  fs: FsInfo
  ndc: number
  arch: string
  core: string
  lwip: number
  freeheap: number
  uptime: number
  time: string
  opt: number
  brand: string
  product: string
  mac: string
  ip: string
}

export interface LedInfo {
  count: number
  pwr: number
  fps: number
  maxpwr: number
  maxseg: number
  cct: boolean
  rgbw: boolean
  wv: number
}

export interface WifiInfo {
  bssid: string
  rssi: number
  signal: number
  channel: number
}

export interface FsInfo {
  u: number
  t: number
  pmt: number
}

export interface WledFullState {
  state: WledState
  info: WledInfo
  effects: string[]
  palettes: string[]
}

export interface WledStateUpdate {
  on?: boolean
  bri?: number
  transition?: number
  ps?: number
  pl?: number
  nl?: Partial<NightlightState>
  udpn?: Partial<UdpState>
  lor?: number
  mainseg?: number
  seg?: Partial<Segment>[]
}

/**
 * Combined state and info response from /json/si
 */
export interface WledStateInfo {
  state: WledState
  info: WledInfo
}

/**
 * Effect metadata from /json/fxdata
 * Each string is a memory-optimized format describing effect parameters
 * Format: "speed_label,intensity_label,...;color1_label,color2_label,...;palette_label;flags;defaults"
 */
export type WledEffectData = string[]

/**
 * A palette can be either:
 * - Array of [position, r, g, b] gradient stops (built-in palettes)
 * - Array of color references like "c1", "c2", "c3", "r" (dynamic palettes)
 */
export type PaletteDefinition = [number, number, number, number][] | string[]

/**
 * Extended palette data from /json/palx (single page)
 */
export interface WledPaletteData {
  /** Number of pages */
  m: number
  /** Palette definitions for this page - index is palette ID */
  p: Record<string, PaletteDefinition>
}

/**
 * Combined palette information with name and colors
 */
export interface PaletteWithColors {
  id: number
  name: string
  colors: PaletteDefinition
}

/**
 * Node discovery from /json/nodes
 */
export interface WledNodes {
  nodes: WledNode[]
}

export interface WledNode {
  /** Node name */
  name: string
  /** IP address */
  ip: string
  /** Node type (0 = unknown, 32 = WLED) */
  type: number
  /** WLED version ID */
  vid: number
}

/**
 * Network info from /json/net
 */
export interface WledNetwork {
  networks: WledNetworkEntry[]
}

export interface WledNetworkEntry {
  ssid: string
  rssi: number
  bssid: string
  channel: number
  enc: number
}

/**
 * Device configuration from /json/cfg
 * This is a complex nested object - we type the commonly used parts
 */
export interface WledConfig {
  rev: [number, number]
  vid: number
  id: {
    mdns: string
    name: string
    inv: string
  }
  nw: {
    ins: NetworkInstance[]
  }
  ap: {
    ssid: string
    pskl: number
    chan: number
    hide: number
    behav: number
    ip: [number, number, number, number]
  }
  hw: {
    led: HardwareLedConfig
    btn: HardwareButtonConfig
    ir: {
      pin: number
      type: number
      sel: boolean
    }
    relay: {
      pin: number
      rev: boolean
    }
  }
  light: {
    'scale-bri': number
    'pal-mode': number
    aseg: boolean
    gc: {
      bri: number
      col: number
      val: number
    }
    tr: {
      mode: boolean
      fx: boolean
      dur: number
      pal: number
      rpc: number
    }
    nl: {
      mode: number
      dur: number
      tbri: number
      macro: number
    }
  }
  def: {
    ps: number
    on: boolean
    bri: number
  }
  /** Additional config sections exist but are less commonly needed */
  [key: string]: unknown
}

export interface NetworkInstance {
  ssid: string
  pskl: number
  ip: [number, number, number, number]
  gw: [number, number, number, number]
  sn: [number, number, number, number]
}

export interface HardwareLedConfig {
  total: number
  maxpwr: number
  ledma: number
  cct: boolean
  cr: boolean
  cb: number
  fps: number
  rgbwm: number
  ld: boolean
  ins: LedInstance[]
}

export interface LedInstance {
  start: number
  len: number
  pin: number[]
  order: number
  rev: boolean
  skip: number
  type: number
  ref: boolean
  rgbwm: number
  freq: number
}

export interface HardwareButtonConfig {
  max: number
  pull: boolean
  ins: ButtonInstance[]
  tt: number
  mqtt: boolean
}

export interface ButtonInstance {
  type: number
  pin: number[]
  macros: [number, number, number]
}

/**
 * Preset stored on device
 * Retrieved from GET /presets.json
 */
export interface WledPreset {
  /** Preset name */
  n: string
  /** Quick load label (max 2 chars or 1 emoji) */
  ql?: string
  /** Power state */
  on?: boolean
  /** Brightness (0-255) */
  bri?: number
  /** Transition time */
  transition?: number
  /** Main segment ID */
  mainseg?: number
  /** Segment configurations */
  seg?: Partial<Segment>[]
}

/**
 * Playlist configuration
 */
export interface WledPlaylist {
  /** Preset IDs to cycle through */
  ps: number[]
  /** Duration for each preset (×100ms) */
  dur: number[]
  /** Transition time for each preset (×100ms) */
  transition?: number[]
  /** Number of times to repeat (0 = infinite) */
  repeat?: number
  /** Preset ID to load when playlist ends (0 = stay on last) */
  end?: number
}

/**
 * Presets file from GET /presets.json
 * Keys are preset IDs as strings, or "playlist" for the playlist config
 */
export type WledPresetsFile = {
  [key: string]: WledPreset | { playlist: WledPlaylist }
}

/**
 * Parsed preset with ID for easier handling
 */
export interface ParsedPreset extends WledPreset {
  /** Preset ID (1-250) */
  id: number
}
