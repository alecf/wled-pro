/**
 * Live LED data ("peek"), modelled on WLED's ws.cpp `sendLiveLedsWs` and json.cpp
 * `serveLiveLeds`. Pixel rendering is simplified: every LED of an "on" segment shows the
 * segment's primary color at the segment's brightness (effects aren't animated), and LEDs
 * outside segments are black. Like WLED, values are scaled by the master brightness (white
 * is added to red, green and blue) and long strips send every `n`th LED.
 */
import type { SimState } from '../types'

/** WLED's cap on ESP32 (256 on ESP8266) */
const MAX_LIVE_LEDS = 1024

/** FastLED's scale8, which WLED uses for brightness */
const scale8 = (value: number, scale: number) => (value * (1 + scale)) >> 8

/** r, g, b for every LED, as the strip shows them */
function renderPixels(state: SimState, ledCount: number): Uint8Array {
  const pixels = new Uint8Array(ledCount * 3)
  if (!state.on) return pixels
  for (const seg of state.seg) {
    if (seg.on === false || seg.stop <= seg.start) continue
    const [r = 0, g = 0, b = 0, w = 0] = seg.col?.[0] ?? []
    const bri = seg.bri ?? 255
    const channels = [r, g, b].map((c) => scale8(Math.min(255, c + w), bri))
    for (let i = Math.max(0, seg.start); i < Math.min(seg.stop, ledCount); i++) {
      pixels.set(channels, i * 3)
    }
  }
  return pixels
}

/** The LEDs WLED would send: every `n`th, brightness-scaled */
function sampledPixels(state: SimState, ledCount: number) {
  const n = Math.floor((ledCount - 1) / MAX_LIVE_LEDS) + 1
  const pixels = renderPixels(state, ledCount)
  const count = Math.floor(ledCount / n)
  const out = new Uint8Array(count * 3)
  for (let i = 0; i < count; i++) {
    for (let c = 0; c < 3; c++) out[i * 3 + c] = scale8(pixels[i * n * 3 + c], state.bri)
  }
  return { n, count, rgb: out }
}

/** A binary WebSocket live frame: 'L', 1 (a strip), then r, g, b per LED */
export function liveFrameBinary(state: SimState, ledCount: number): Uint8Array {
  const { rgb } = sampledPixels(state, ledCount)
  const frame = new Uint8Array(2 + rgb.length)
  frame[0] = 'L'.charCodeAt(0)
  frame[1] = 1
  frame.set(rgb, 2)
  return frame
}

/** The `/json/live` response: `{leds: ["RRGGBB", ...], n}` */
export function liveJson(state: SimState, ledCount: number) {
  const { n, count, rgb } = sampledPixels(state, ledCount)
  const leds: string[] = []
  for (let i = 0; i < count; i++) {
    const value = (rgb[i * 3] << 16) | (rgb[i * 3 + 1] << 8) | rgb[i * 3 + 2]
    leds.push(value.toString(16).toUpperCase().padStart(6, '0'))
  }
  return { leds, n }
}
