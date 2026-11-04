/**
 * Live LED data ("peek"): what the LEDs are showing right now, as WLED streams it.
 *
 * WLED sends it two ways (see docs/wled-api/websocket.md#live-led-data):
 * - over the WebSocket, after `{"lv":true}`: binary frames `'L', version, [w, h,] r, g, b, ...`
 *   (version 1 = a strip, version 2 = a 2D matrix with its width and height)
 * - over HTTP, `GET /json/live`: `{"leds": ["RRGGBB", ...], "n": 1}` (plus `w`/`h` on a matrix)
 *
 * Both are already scaled by the master brightness, and both may skip LEDs on long strips
 * (every `n`th LED is sent), so a frame can hold fewer pixels than the strip has LEDs.
 */

export interface LiveFrame {
  /** r, g, b for each pixel, row by row */
  rgb: Uint8Array
  /** Pixels per row (the pixel count for a strip) */
  width: number
  /** Rows (1 for a strip) */
  height: number
}

const LIVE_MARKER = 'L'.charCodeAt(0)

/** A binary WebSocket live frame, or null if `data` isn't one */
export function parseLiveBinary(data: ArrayBuffer | Uint8Array): LiveFrame | null {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  if (bytes.length < 2 || bytes[0] !== LIVE_MARKER) return null
  const version = bytes[1]
  if (version === 1) {
    const count = Math.floor((bytes.length - 2) / 3)
    return { rgb: bytes.slice(2, 2 + count * 3), width: count, height: 1 }
  }
  if (version === 2 && bytes.length >= 4) {
    const width = bytes[2]
    const height = bytes[3]
    const count = Math.min(width * height, Math.floor((bytes.length - 4) / 3))
    if (width === 0 || height === 0) return null
    return { rgb: bytes.slice(4, 4 + count * 3), width, height: Math.ceil(count / width) }
  }
  return null
}

/** A `/json/live` response (or the same shape over the WebSocket), or null if `json` isn't one */
export function parseLiveJson(json: unknown): LiveFrame | null {
  if (typeof json !== 'object' || json === null) return null
  const { leds, w, h } = json as { leds?: unknown; w?: unknown; h?: unknown }
  if (!Array.isArray(leds)) return null
  const rgb = new Uint8Array(leds.length * 3)
  leds.forEach((led, i) => {
    // RRGGBB; take the last 6 digits in case a firmware sends WWRRGGBB
    const value = typeof led === 'string' ? parseInt(led.slice(-6), 16) : Number.NaN
    if (Number.isNaN(value)) return
    rgb[i * 3] = (value >> 16) & 0xff
    rgb[i * 3 + 1] = (value >> 8) & 0xff
    rgb[i * 3 + 2] = value & 0xff
  })
  const isMatrix = typeof w === 'number' && typeof h === 'number' && w > 0 && h > 0
  if (isMatrix) return { rgb, width: w, height: Math.ceil(leds.length / w) }
  return { rgb, width: leds.length, height: 1 }
}
