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

/**
 * Timer/Schedule configuration
 * Retrieved from /json/cfg under timers.ins array
 */
export interface WledTimer {
  /** Enabled (0 = disabled, 1 = enabled) */
  en: number
  /** Hour (0-23, 24 = every hour, 255 = sunrise/sunset for timers 8-9) */
  hour: number
  /** Minute (0-59, or offset -59 to +59 for sunrise/sunset timers) */
  min: number
  /** Preset/macro ID to trigger (1-250) */
  macro: number
  /** Days of week bitmask (bits 0-6 = Mon-Sun, 127 = every day) */
  dow: number
  /** Start date (only for timers 0-7) */
  start?: {
    /** Start month (1-12) */
    mon: number
    /** Start day (1-31) */
    day: number
  }
  /** End date (only for timers 0-7) */
  end?: {
    /** End month (1-12) */
    mon: number
    /** End day (1-31) */
    day: number
  }
}

/**
 * Timers configuration object from /json/cfg
 */
export interface WledTimersConfig {
  /** Array of timer configurations (up to 10) */
  ins: (WledTimer | null)[]
}

/**
 * NTP time synchronization configuration
 */
export interface WledNtpConfig {
  /** NTP enabled */
  en: boolean
  /** NTP server hostname */
  host: string
  /** Timezone (0-23, see TIMEZONE_OPTIONS for labels) */
  tz: number
  /** UTC offset in seconds for fine-tuning */
  offset: number
  /** Use 12-hour AM/PM format instead of 24-hour */
  ampm: boolean
  /** Latitude for sunrise/sunset calculations */
  lt: number
  /** Longitude for sunrise/sunset calculations */
  ln: number
}

// ============================================================================
// Configuration Types (from /json/cfg)
// ============================================================================

/**
 * WiFi configuration
 */
export interface WledWifiConfig {
  /** WiFi sleep mode enabled */
  sleep: boolean
  /** Physical layer enabled */
  phy: boolean
}

/**
 * Access Point configuration
 */
export interface WledApConfig {
  /** AP SSID */
  ssid: string
  /** Password length (actual password not returned by API) */
  pskl: number
  /** AP WiFi channel (1-13) */
  chan: number
  /** Hide SSID (0 = visible, 1 = hidden) */
  hide: number
  /** AP behavior (0 = always off, 1 = on if no WiFi, 2 = always on) */
  behav: number
  /** AP IP address as [a, b, c, d] */
  ip: [number, number, number, number]
}

/**
 * OTA (Over-The-Air) update and security configuration
 */
export interface WledOtaConfig {
  /** OTA lock enabled - requires password for updates */
  lock: boolean
  /** WiFi settings lock enabled - requires password to change WiFi */
  'lock-wifi': boolean
  /** Password length (actual password not returned by API) */
  pskl: number
  /** ArduinoOTA enabled */
  aota: boolean
}

/**
 * Sync interface configuration for UDP
 */
export interface WledSyncConfig {
  /** UDP port for sync */
  port0: number
  /** Secondary UDP port */
  port1: number
  /** Receive settings */
  recv: {
    /** Receive brightness changes */
    bri: boolean
    /** Receive color changes */
    col: boolean
    /** Receive effect changes */
    fx: boolean
    /** Receive sync group */
    grp: number
    /** Receive segment data */
    seg: boolean
    /** Send on boot */
    sb: boolean
  }
  /** Send settings */
  send: {
    /** Send direct changes */
    dir: boolean
    /** Send on button press */
    btn: boolean
    /** Send on value change (Alexa) */
    va: boolean
    /** Send Hue changes */
    hue: boolean
    /** Send macro changes */
    macro: boolean
    /** Send sync group */
    grp: number
    /** Retries */
    ret: number
  }
}

/**
 * E1.31/sACN DMX configuration
 */
export interface WledDmxConfig {
  /** Starting universe (1-63999) */
  uni: number
  /** Skip out-of-sequence packets */
  seqskip: boolean
  /** E1.31 priority (0-200) */
  e131prio: number
  /** DMX start address (1-512) */
  addr: number
  /** Destination skip size */
  dss: number
  /** DMX mode (0-10) */
  mode: number
}

/**
 * Live/realtime control configuration
 */
export interface WledLiveConfig {
  /** Realtime enabled */
  en: boolean
  /** Multiple segment override */
  mso: boolean
  /** E1.31 port */
  port: number
  /** Multicast enabled */
  mc: boolean
  /** DMX settings */
  dmx: WledDmxConfig
  /** Timeout in seconds */
  timeout: number
  /** Max brightness enabled */
  maxbri: boolean
  /** No gamma correction for realtime */
  'no-gc': boolean
  /** LED offset */
  offset: number
}

/**
 * Voice assistant (Alexa) configuration
 */
export interface WledAlexaConfig {
  /** Alexa emulation enabled */
  alexa: boolean
  /** Macros for on/off [on, off] */
  macros: [number, number]
  /** Priority */
  p: number
}

/**
 * MQTT configuration
 */
export interface WledMqttConfig {
  /** MQTT enabled */
  en: boolean
  /** Broker address */
  broker: string
  /** Broker port */
  port: number
  /** Username */
  user: string
  /** Password length (actual password not returned by API) */
  pskl: number
  /** Client ID */
  cid: string
  /** Retain messages */
  rtn: boolean
  /** Topics */
  topics: {
    /** Device topic */
    device: string
    /** Group topic */
    group: string
  }
}

/**
 * Philips Hue sync configuration
 */
export interface WledHueConfig {
  /** Hue sync enabled */
  en: boolean
  /** Hue light ID to sync */
  id: number
  /** Poll interval in 100ms units */
  iv: number
  /** Receive settings */
  recv: {
    /** Receive on/off */
    on: boolean
    /** Receive brightness */
    bri: boolean
    /** Receive color */
    col: boolean
  }
  /** Hue bridge IP as [a, b, c, d] */
  ip: [number, number, number, number]
}

/**
 * Node discovery configuration
 */
export interface WledNodesConfig {
  /** Show in node list */
  list: boolean
  /** Broadcast presence */
  bcast: boolean
}

/**
 * Interface configuration (sync, live, MQTT, Hue, etc.)
 */
export interface WledInterfaceConfig {
  /** UDP sync configuration */
  sync: WledSyncConfig
  /** Node discovery settings */
  nodes: WledNodesConfig
  /** Live/realtime control */
  live: WledLiveConfig
  /** Voice assistant (Alexa) */
  va: WledAlexaConfig
  /** MQTT configuration */
  mqtt: WledMqttConfig
  /** Philips Hue sync */
  hue: WledHueConfig
  /** NTP configuration */
  ntp: WledNtpConfig
}

/**
 * Device identity configuration
 */
export interface WledIdentityConfig {
  /** mDNS hostname (without .local) */
  mdns: string
  /** Device name */
  name: string
  /** Alexa invocation name */
  inv: string
}

/**
 * Infrared receiver configuration
 */
export interface WledIrConfig {
  /** GPIO pin (-1 = disabled) */
  pin: number
  /** IR remote type */
  type: number
  /** IR enabled */
  sel: boolean
}

/**
 * Relay configuration
 */
export interface WledRelayConfig {
  /** GPIO pin (-1 = disabled) */
  pin: number
  /** Inverted logic */
  rev: boolean
}

/**
 * Full device configuration from /json/cfg
 */
export interface WledFullConfig {
  /** Config revision */
  rev: [number, number]
  /** Firmware version ID */
  vid: number
  /** Device identity */
  id: WledIdentityConfig
  /** Network instances (WiFi connections) */
  nw: {
    ins: NetworkInstance[]
  }
  /** Access Point settings */
  ap: WledApConfig
  /** WiFi settings */
  wifi: WledWifiConfig
  /** Hardware configuration */
  hw: {
    led: HardwareLedConfig
    com: unknown[]
    btn: HardwareButtonConfig
    ir: WledIrConfig
    relay: WledRelayConfig
    baud: number
    if: {
      'i2c-pin': [number, number]
      'spi-pin': [number, number, number]
    }
  }
  /** Lighting behavior */
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
  /** Default/boot state */
  def: {
    ps: number
    on: boolean
    bri: number
  }
  /** Interface settings (sync, live, MQTT, etc.) */
  if: WledInterfaceConfig
  /** OTA update settings */
  ota: WledOtaConfig
  /** Usermod settings */
  um: Record<string, unknown>
  /** Timer configuration */
  timers: WledTimersConfig & {
    cntdwn: {
      goal: [number, number, number, number, number, number]
      macro: number
    }
  }
}
