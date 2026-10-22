/**
 * POST /json/cfg semantics: deep-merge into cfg (arrays replace), with the side
 * effects the app relies on reflected into `info`.
 */
import type { WledInfo } from '@/types/wled'
import type { JsonObject } from '../types'
import { deepMergeInto, isPlainObject } from './values'

export function applyConfigUpdate(cfg: JsonObject, info: WledInfo, patch: JsonObject): void {
  // WLED never stores plaintext passwords in cfg; it reports their length (pskl).
  const sanitized = stripPasswords(patch)
  deepMergeInto(cfg, sanitized)

  const id = patch.id
  if (isPlainObject(id) && typeof id.name === 'string') info.name = id.name

  const hw = patch.hw
  if (isPlainObject(hw) && isPlainObject(hw.led)) {
    const led = hw.led
    if (typeof led.total === 'number') info.leds.count = led.total
    if (Array.isArray(led.ins)) {
      const total = led.ins.reduce(
        (sum, ins) => sum + (isPlainObject(ins) && typeof ins.len === 'number' ? ins.len : 0),
        0,
      )
      if (total > 0) info.leds.count = total
    }
    if (typeof led.maxpwr === 'number') info.leds.maxpwr = led.maxpwr
  }
}

function stripPasswords(value: JsonObject): JsonObject {
  const out: JsonObject = {}
  for (const [k, v] of Object.entries(value)) {
    if (k === 'psk' && typeof v === 'string') {
      out.pskl = v.length
    } else if (isPlainObject(v)) {
      out[k] = stripPasswords(v)
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) => (isPlainObject(item) ? stripPasswords(item) : item))
    } else {
      out[k] = v
    }
  }
  return out
}
