/**
 * Top-level state update semantics, modelled on WLED's `deserializeState()`
 * and presets.cpp. Independent from the app's optimistic merge in src/lib.
 *
 * Modelled:
 * - `on`: true/false/"t"; `bri`: 0-255 or "~N"; `bri: 0` turns off and keeps the
 *   last brightness; a non-zero `bri` without `on` turns the light on.
 * - `transition`, `mainseg`, `lor`, `nl`, `udpn` (store-only); `tt` is ignored.
 * - `seg` (see segments.ts).
 * - `ps: N` applies preset N and sets `state.ps`; a preset that holds a playlist
 *   starts it (`state.pl`). String `ps` ranges ("1~5~") are ignored.
 * - `psave: N` snapshots the current state (bounds only with `sb`, brightness only
 *   with `ib`), or saves the request's `playlist` when one is included.
 * - `pdel: N` deletes a preset. `playlist` without `psave` starts it. `pl: -1` stops.
 * - Any other change resets `state.ps` to -1.
 */
import type { WledPreset, WledPresetsFile } from '@/types/wled'
import type { JsonObject, SimState } from '../types'
import { applySegmentInput, type SegmentContext } from './segments'
import { clone, isPlainObject, resolveBool, resolveNumber } from './values'

export interface DeviceModel extends Omit<SegmentContext, 'state'> {
  state: SimState
  presets: WledPresetsFile
}

/** Keys that control presets/responses rather than describing state. */
const CONTROL_KEYS = new Set([
  'v',
  'ps',
  'psave',
  'pdel',
  'pl',
  'playlist',
  'n',
  'ql',
  'ib',
  'sb',
  'sc',
  'o',
  'time',
  'tt',
  'lv',
  'rb',
])

export function applyStateUpdate(model: DeviceModel, update: JsonObject, depth = 0): void {
  // Saving takes precedence: WLED saves instead of applying when psave is present.
  if (typeof update.psave === 'number') {
    savePreset(model, update.psave, update)
    return
  }

  if (typeof update.pdel === 'number') {
    delete model.presets[String(update.pdel)]
  }

  const { state } = model
  let changedState = false

  if ('bri' in update) {
    const next = resolveNumber(update.bri, state.bri, 0, 255, model.random)
    if (next === 0) {
      state.on = false
    } else {
      state.bri = next
      if (!('on' in update)) state.on = true
    }
    changedState = true
  }
  if ('on' in update) {
    state.on = resolveBool(update.on, state.on)
    changedState = true
  }
  if ('transition' in update) {
    state.transition = resolveNumber(update.transition, state.transition, 0, 65535)
    changedState = true
  }
  if ('lor' in update) {
    state.lor = resolveNumber(update.lor, state.lor, 0, 2)
    changedState = true
  }
  if (isPlainObject(update.nl)) {
    Object.assign(state.nl, update.nl)
    changedState = true
  }
  if (isPlainObject(update.udpn)) {
    Object.assign(state.udpn, update.udpn)
    changedState = true
  }
  if ('seg' in update) {
    applySegmentInput(model, update.seg)
    changedState = true
  }
  if ('mainseg' in update) {
    state.mainseg = resolveNumber(update.mainseg, state.mainseg, 0, state.seg.length - 1)
    changedState = true
  }

  if (changedState && depth === 0) state.ps = -1

  // `pl` is read-only in WLED except for `pl: -1`, which stops the playlist.
  if (update.pl === -1) state.pl = -1

  // An inline playlist (without psave) starts immediately.
  if (isPlainObject(update.playlist)) {
    startPlaylist(model, 0, update.playlist, depth)
  }

  if (typeof update.ps === 'number' && update.ps > 0) {
    loadPreset(model, update.ps, depth)
  }
}

function loadPreset(model: DeviceModel, id: number, depth: number) {
  if (depth > 3) return // guard against presets that load presets
  const preset = model.presets[String(id)] as (WledPreset & JsonObject) | undefined
  if (!preset || !isPlainObject(preset)) return
  if (isPlainObject(preset.playlist)) {
    startPlaylist(model, id, preset.playlist, depth)
    return
  }
  const body: JsonObject = {}
  for (const [k, v] of Object.entries(preset)) {
    if (k !== 'n' && k !== 'ql') body[k] = clone(v)
  }
  applyStateUpdate(model, body, depth + 1)
  model.state.ps = id
}

function startPlaylist(model: DeviceModel, id: number, playlist: JsonObject, depth: number) {
  const ids = Array.isArray(playlist.ps) ? playlist.ps.filter((p) => typeof p === 'number') : []
  if (ids.length === 0) return
  // Playlist timing/advance is not simulated: we load the first entry and stay there.
  loadPreset(model, ids[0], depth + 1)
  model.state.pl = id
}

function savePreset(model: DeviceModel, id: number, update: JsonObject) {
  if (id < 1 || id > 250) return
  const name = typeof update.n === 'string' ? update.n : `Preset ${id}`
  const preset: JsonObject = { n: name }
  if (typeof update.ql === 'string' && update.ql) preset.ql = update.ql

  if (isPlainObject(update.playlist)) {
    preset.playlist = clone(update.playlist)
  } else if (update.o === true) {
    // "Save API command": store the request body itself.
    for (const [k, v] of Object.entries(update)) {
      if (!CONTROL_KEYS.has(k)) preset[k] = clone(v)
    }
  } else {
    const { state } = model
    preset.on = state.on
    if (update.ib === true) preset.bri = state.bri
    preset.transition = state.transition
    preset.mainseg = state.mainseg
    preset.seg = state.seg.map((s) => {
      const copy = clone(s) as unknown as JsonObject
      delete copy.len
      if (update.sb !== true) {
        for (const key of ['start', 'stop', 'grp', 'spc', 'of']) delete copy[key]
      }
      return copy
    })
  }
  model.presets[String(id)] = preset as unknown as WledPreset
  model.state.ps = id
}
