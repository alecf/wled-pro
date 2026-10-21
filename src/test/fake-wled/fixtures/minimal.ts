/**
 * Small hand-built device: 150 LEDs, 3 segments, 10 effects, 10 palettes
 * (2 palx pages) and a few presets. Values follow WLED 0.15 on an ESP32.
 *
 * Remember: WLED segment `stop` is EXCLUSIVE ([0, 50) covers LEDs 0..49).
 */
import type { WledFullConfig, WledInfo } from '@/types/wled'
import type { JsonObject, SimSegment, WledFixture } from '../types'
import { makeSegment } from './builders'

export const MINIMAL_LED_COUNT = 150

/** Effect names; index is the effect id. */
export const MINIMAL_EFFECTS = [
  'Solid',
  'Blink',
  'Breathe',
  'Wipe',
  'Wipe Random',
  'Random Colors',
  'Sweep',
  'Dynamic',
  'Colorloop',
  'Rainbow',
]

/** Effect metadata strings from /json/fxdata (same order as MINIMAL_EFFECTS). */
export const MINIMAL_FXDATA = [
  '',
  '!,Duty cycle;!,!;!;01',
  '!;!,!;!;01',
  '!,!;!,!;!',
  '!;;!',
  '!,Fade time;;!;01',
  '!,!;!,!;!',
  '!,!,,,,Smooth;;!',
  '!,Saturation;;!;01',
  '!,Size;;!',
]

export const MINIMAL_PALETTES = [
  'Default',
  '* Random Cycle',
  '* Color 1',
  '* Colors 1&2',
  '* Color Gradient',
  '* Colors Only',
  'Party',
  'Cloud',
  'Lava',
  'Ocean',
]

const MINIMAL_PALX: WledFixture['palx'] = {
  '0': [
    [0, 255, 0, 0],
    [85, 0, 255, 0],
    [170, 0, 0, 255],
    [255, 255, 0, 0],
  ],
  '1': ['r', 'r', 'r', 'r'],
  '2': ['c1'],
  '3': ['c1', 'c1', 'c2', 'c2'],
  '4': ['c3', 'c2', 'c1'],
  '5': ['c1', 'c1', 'c1', 'c1', 'c1', 'c2', 'c2', 'c2', 'c2', 'c2', 'c3', 'c3', 'c3', 'c3'],
  '6': [
    [0, 85, 0, 171],
    [64, 171, 0, 85],
    [128, 255, 0, 0],
    [192, 255, 171, 0],
    [255, 85, 0, 171],
  ],
  '7': [
    [0, 0, 0, 255],
    [64, 0, 0, 139],
    [128, 135, 206, 235],
    [255, 255, 255, 255],
  ],
  '8': [
    [0, 0, 0, 0],
    [46, 255, 0, 0],
    [96, 255, 128, 0],
    [255, 255, 255, 255],
  ],
  '9': [
    [0, 0, 32, 64],
    [128, 0, 128, 192],
    [255, 128, 255, 255],
  ],
}

function minimalSegments(): SimSegment[] {
  return [
    makeSegment(0, 0, 50, {
      n: 'Left',
      col: [
        [255, 160, 0],
        [0, 0, 0],
        [0, 0, 0],
      ],
      sel: true,
    }),
    makeSegment(1, 50, 100, { n: 'Middle', fx: 9, pal: 6 }),
    makeSegment(2, 100, MINIMAL_LED_COUNT, {
      n: 'Right',
      fx: 2,
      col: [
        [0, 0, 255],
        [0, 0, 0],
        [0, 0, 0],
      ],
    }),
  ]
}

function minimalInfo(): WledInfo {
  const info: WledInfo & { leds: WledInfo['leds'] & { seglc: number[]; lc: number } } = {
    ver: '0.15.0',
    vid: 2410270,
    leds: {
      count: MINIMAL_LED_COUNT,
      pwr: 0,
      fps: 42,
      maxpwr: 850,
      maxseg: 10,
      cct: false,
      rgbw: false,
      wv: 0,
      seglc: [1, 1, 1],
      lc: 1,
    },
    str: false,
    name: 'Fake WLED',
    udpport: 21324,
    live: false,
    liveseg: -1,
    lm: '',
    lip: '',
    ws: 0,
    fxcount: MINIMAL_EFFECTS.length,
    palcount: MINIMAL_PALETTES.length,
    cpalcount: 0,
    maps: [0],
    wifi: { bssid: '00:00:00:00:00:00', rssi: -50, signal: 100, channel: 6 },
    fs: { u: 12, t: 983, pmt: 0 },
    ndc: 0,
    arch: 'esp32',
    core: 'v3.3.6-16-gcc5440f6a2',
    lwip: 0,
    freeheap: 180000,
    uptime: 1000,
    time: '2026-1-1, 12:00:00',
    opt: 79,
    brand: 'WLED',
    product: 'FOSS',
    mac: '000000000000',
    ip: '127.0.0.1',
  }
  return info
}

function minimalConfig(): WledFullConfig {
  return {
    rev: [1, 0],
    vid: 2410270,
    id: { mdns: 'fake-wled', name: 'Fake WLED', inv: 'Light' },
    nw: {
      ins: [
        { ssid: 'FakeNet', pskl: 8, ip: [0, 0, 0, 0], gw: [0, 0, 0, 0], sn: [255, 255, 255, 0] },
      ],
    },
    ap: { ssid: 'WLED-AP', pskl: 8, chan: 1, hide: 0, behav: 0, ip: [4, 3, 2, 1] },
    wifi: { sleep: false, phy: false },
    hw: {
      led: {
        total: MINIMAL_LED_COUNT,
        maxpwr: 850,
        ledma: 55,
        cct: false,
        cr: false,
        cb: 0,
        fps: 42,
        rgbwm: 255,
        ld: false,
        ins: [
          {
            start: 0,
            len: MINIMAL_LED_COUNT,
            pin: [2],
            order: 0,
            rev: false,
            skip: 0,
            type: 22,
            ref: false,
            rgbwm: 0,
            freq: 0,
          },
        ],
      },
      com: [],
      btn: {
        max: 4,
        pull: true,
        ins: [{ type: 2, pin: [0], macros: [0, 0, 0] }],
        tt: 32,
        mqtt: false,
      },
      ir: { pin: -1, type: 0, sel: true },
      relay: { pin: -1, rev: false },
      baud: 1152,
      if: { 'i2c-pin': [-1, -1], 'spi-pin': [-1, -1, -1] },
    },
    light: {
      'scale-bri': 100,
      'pal-mode': 0,
      aseg: false,
      gc: { bri: 1, col: 2.8, val: 2.8 },
      tr: { mode: true, fx: true, dur: 7, pal: 0, rpc: 5 },
      nl: { mode: 1, dur: 60, tbri: 0, macro: 0 },
    },
    def: { ps: 0, on: true, bri: 128 },
    if: {
      sync: {
        port0: 21324,
        port1: 65506,
        recv: { bri: true, col: true, fx: true, grp: 1, seg: false, sb: false },
        send: { dir: false, btn: false, va: false, hue: true, macro: false, grp: 1, ret: 0 },
      },
      nodes: { list: true, bcast: true },
      live: {
        en: true,
        mso: false,
        port: 5568,
        mc: false,
        dmx: { uni: 1, seqskip: false, e131prio: 0, addr: 1, dss: 0, mode: 4 },
        timeout: 25,
        maxbri: false,
        'no-gc': true,
        offset: 0,
      },
      va: { alexa: false, macros: [0, 0], p: 0 },
      mqtt: {
        en: false,
        broker: '',
        port: 1883,
        user: '',
        pskl: 0,
        cid: 'WLED-000000',
        rtn: false,
        topics: { device: 'wled/000000', group: 'wled/all' },
      },
      hue: { en: false, id: 1, iv: 25, recv: { on: true, bri: true, col: true }, ip: [0, 0, 0, 0] },
      ntp: { en: false, host: '0.wled.pool.ntp.org', tz: 0, offset: 0, ampm: false, lt: 0, ln: 0 },
    },
    ota: { lock: false, 'lock-wifi': false, pskl: 7, aota: true },
    um: {},
    timers: { cntdwn: { goal: [20, 1, 1, 0, 0, 0], macro: 0 }, ins: [] },
  }
}

/** Build a fresh copy of the minimal fixture. */
export function minimalFixture(): WledFixture {
  return {
    state: {
      on: true,
      bri: 128,
      transition: 7,
      ps: -1,
      pl: -1,
      nl: { on: false, dur: 60, mode: 1, tbri: 0, rem: -1 },
      udpn: { send: false, recv: true, sgrp: 1, rgrp: 1 },
      lor: 0,
      mainseg: 0,
      seg: minimalSegments(),
    },
    info: minimalInfo(),
    effects: [...MINIMAL_EFFECTS],
    palettes: [...MINIMAL_PALETTES],
    fxdata: [...MINIMAL_FXDATA],
    palx: structuredClone(MINIMAL_PALX),
    cfg: minimalConfig() as unknown as JsonObject,
    presets: {
      '0': {} as never,
      '1': {
        n: 'Warm White',
        ql: 'W',
        on: true,
        bri: 200,
        mainseg: 0,
        seg: [
          {
            id: 0,
            fx: 0,
            col: [
              [255, 180, 100],
              [0, 0, 0],
              [0, 0, 0],
            ],
          },
        ],
      },
      '2': {
        n: 'Party',
        on: true,
        bri: 255,
        mainseg: 0,
        seg: [
          { id: 0, start: 0, stop: MINIMAL_LED_COUNT, fx: 9, pal: 6, sx: 200 },
          { id: 1, stop: 0 },
          { id: 2, stop: 0 },
        ],
      },
      '3': {
        n: 'Cycle',
        playlist: { ps: [1, 2], dur: [100, 100], transition: [7, 7], repeat: 0, end: 0 },
      },
    },
    files: {},
    nodes: { nodes: [] },
    net: {
      networks: [{ ssid: 'FakeNet', rssi: -50, bssid: '00:11:22:33:44:55', channel: 6, enc: 3 }],
    },
  }
}
