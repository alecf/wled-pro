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
  seg?: Partial<Segment>[]
}
