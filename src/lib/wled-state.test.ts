import { describe, it, expect } from 'vitest'
import { mergeWledState, mergeWledStateUpdate } from './wled-state'
import type { WledState, WledStateUpdate, Segment } from '@/types/wled'

// Helper to create a minimal valid WledState
function createBaseState(overrides: Partial<WledState> = {}): WledState {
  return {
    on: true,
    bri: 128,
    transition: 7,
    ps: -1,
    pl: -1,
    nl: { on: false, dur: 60, mode: 1, tbri: 0, rem: 0 },
    udpn: { send: false, recv: true, sgrp: 1, rgrp: 1 },
    lor: 0,
    mainseg: 0,
    seg: [createSegment(0)],
    ...overrides,
  }
}

function createSegment(id: number, overrides: Partial<Segment> = {}): Segment {
  return {
    id,
    start: 0,
    stop: 30,
    len: 30,
    grp: 1,
    spc: 0,
    of: 0,
    on: true,
    frz: false,
    bri: 255,
    cct: 127,
    col: [[255, 0, 0], [0, 255, 0], [0, 0, 255]],
    fx: 0,
    sx: 128,
    ix: 128,
    pal: 0,
    c1: 128,
    c2: 128,
    c3: 16,
    sel: true,
    rev: false,
    mi: false,
    ...overrides,
  }
}

describe('mergeWledState', () => {
  describe('primitive values', () => {
    it('updates brightness', () => {
      const base = createBaseState({ bri: 100 })
      const result = mergeWledState(base, { bri: 200 })
      expect(result.bri).toBe(200)
      expect(result.on).toBe(true) // unchanged
    })

    it('updates on/off state', () => {
      const base = createBaseState({ on: true })
      const result = mergeWledState(base, { on: false })
      expect(result.on).toBe(false)
    })

    it('updates multiple primitives at once', () => {
      const base = createBaseState({ on: false, bri: 50 })
      const result = mergeWledState(base, { on: true, bri: 255, transition: 10 })
      expect(result.on).toBe(true)
      expect(result.bri).toBe(255)
      expect(result.transition).toBe(10)
    })
  })

  describe('nested objects', () => {
    it('merges nightlight settings', () => {
      const base = createBaseState({
        nl: { on: false, dur: 60, mode: 1, tbri: 0, rem: 0 },
      })
      const result = mergeWledState(base, { nl: { on: true, dur: 30 } })
      expect(result.nl.on).toBe(true)
      expect(result.nl.dur).toBe(30)
      expect(result.nl.mode).toBe(1) // unchanged
    })

    it('merges UDP settings', () => {
      const base = createBaseState({
        udpn: { send: false, recv: true, sgrp: 1, rgrp: 1 },
      })
      const result = mergeWledState(base, { udpn: { send: true } })
      expect(result.udpn.send).toBe(true)
      expect(result.udpn.recv).toBe(true) // unchanged
    })
  })

  describe('segment updates by id', () => {
    it('updates segment by id', () => {
      const base = createBaseState({
        seg: [createSegment(0, { bri: 100 }), createSegment(1, { bri: 150 })],
      })
      const result = mergeWledState(base, {
        seg: [{ id: 1, bri: 255 }],
      })
      expect(result.seg[0].bri).toBe(100) // unchanged
      expect(result.seg[1].bri).toBe(255) // updated
    })

    it('updates multiple segments by id', () => {
      const base = createBaseState({
        seg: [createSegment(0), createSegment(1), createSegment(2)],
      })
      const result = mergeWledState(base, {
        seg: [
          { id: 0, fx: 10 },
          { id: 2, fx: 20 },
        ],
      })
      expect(result.seg[0].fx).toBe(10)
      expect(result.seg[1].fx).toBe(0) // unchanged
      expect(result.seg[2].fx).toBe(20)
    })
  })

  describe('segment updates by index', () => {
    it('updates segment by index when no id provided', () => {
      const base = createBaseState({
        seg: [createSegment(0, { bri: 100 }), createSegment(1, { bri: 150 })],
      })
      const result = mergeWledState(base, {
        seg: [{ bri: 200 }], // no id, updates index 0
      })
      expect(result.seg[0].bri).toBe(200)
      expect(result.seg[1].bri).toBe(150) // unchanged
    })
  })

  describe('segment color updates', () => {
    it('merges colors by index', () => {
      const base = createBaseState({
        seg: [createSegment(0, { col: [[255, 0, 0], [0, 255, 0], [0, 0, 255]] })],
      })
      const result = mergeWledState(base, {
        seg: [{ id: 0, col: [[0, 0, 0]] }], // only update first color
      })
      expect(result.seg[0].col[0]).toEqual([0, 0, 0])
      expect(result.seg[0].col[1]).toEqual([0, 255, 0]) // unchanged
      expect(result.seg[0].col[2]).toEqual([0, 0, 255]) // unchanged
    })
  })
})

describe('mergeWledStateUpdate', () => {
  describe('primitive coalescing', () => {
    it('merges two updates with different keys', () => {
      const result = mergeWledStateUpdate({ bri: 100 }, { on: true })
      expect(result).toEqual({ bri: 100, on: true })
    })

    it('second update overrides first for same key', () => {
      const result = mergeWledStateUpdate({ bri: 100 }, { bri: 200 })
      expect(result.bri).toBe(200)
    })
  })

  describe('nested object coalescing', () => {
    it('merges nightlight updates', () => {
      const result = mergeWledStateUpdate(
        { nl: { on: true } },
        { nl: { dur: 30 } }
      )
      expect(result.nl).toEqual({ on: true, dur: 30 })
    })
  })

  describe('segment update coalescing', () => {
    it('merges segment updates for same id', () => {
      const result = mergeWledStateUpdate(
        { seg: [{ id: 0, bri: 100 }] },
        { seg: [{ id: 0, fx: 10 }] }
      )
      expect(result.seg).toHaveLength(1)
      expect(result.seg![0]).toEqual({ id: 0, bri: 100, fx: 10 })
    })

    it('keeps separate segment updates for different ids', () => {
      const result = mergeWledStateUpdate(
        { seg: [{ id: 0, bri: 100 }] },
        { seg: [{ id: 1, bri: 200 }] }
      )
      expect(result.seg).toHaveLength(2)
    })

    it('merges color updates within same segment', () => {
      const result = mergeWledStateUpdate(
        { seg: [{ id: 0, col: [[255, 0, 0]] }] },
        { seg: [{ id: 0, col: [[0, 0, 0], [0, 255, 0]] }] }
      )
      // Second update should override/merge colors
      expect(result.seg![0].col![0]).toEqual([0, 0, 0])
      expect(result.seg![0].col![1]).toEqual([0, 255, 0])
    })
  })

  describe('complex coalescing scenarios', () => {
    it('coalesces brightness + segment effect + segment color in one update', () => {
      let result: WledStateUpdate = {}
      result = mergeWledStateUpdate(result, { bri: 200 })
      result = mergeWledStateUpdate(result, { seg: [{ id: 0, fx: 5 }] })
      result = mergeWledStateUpdate(result, { seg: [{ id: 0, col: [[128, 128, 128]] }] })

      expect(result.bri).toBe(200)
      expect(result.seg).toHaveLength(1)
      expect(result.seg![0].id).toBe(0)
      expect(result.seg![0].fx).toBe(5)
      expect(result.seg![0].col![0]).toEqual([128, 128, 128])
    })
  })
})
