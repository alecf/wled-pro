import { describe, expect, it } from 'vitest'
import type { GlobalSegment } from '@/types/segments'
import type { Segment } from '@/types/wled'
import { findMatchingGlobalSegment, getSegmentLabel } from './segmentLabeling'

// Helper to create a test global segment
function createGlobalSegment(overrides?: Partial<GlobalSegment>): GlobalSegment {
  return {
    id: crypto.randomUUID(),
    start: 0,
    stop: 100,
    name: 'Test Segment',
    ...overrides,
  }
}

// Helper to create a test WLED segment
function createWledSegment(overrides?: Partial<Segment>): Segment {
  return {
    id: 0,
    start: 0,
    stop: 100,
    len: 100,
    grp: 1,
    spc: 0,
    of: 0,
    on: true,
    frz: false,
    bri: 255,
    cct: 127,
    col: [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ],
    fx: 0,
    sx: 128,
    ix: 128,
    pal: 0,
    c1: 128,
    c2: 128,
    c3: 16,
    sel: false,
    rev: false,
    mi: false,
    ...overrides,
  }
}

describe('segmentLabeling', () => {
  describe('findMatchingGlobalSegment', () => {
    it('should find exact position match', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'First Half' }),
        createGlobalSegment({ start: 50, stop: 100, name: 'Second Half' }),
      ]
      const segment = createWledSegment({ start: 50, stop: 100 })

      const match = findMatchingGlobalSegment(segment, globals)

      expect(match).toBeDefined()
      expect(match?.name).toBe('Second Half')
    })

    it('should return undefined for no match', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 50 })]
      const segment = createWledSegment({ start: 50, stop: 100 })

      const match = findMatchingGlobalSegment(segment, globals)

      expect(match).toBeUndefined()
    })

    it('should not match partial overlaps', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 60 })]
      const segment = createWledSegment({ start: 0, stop: 50 })

      const match = findMatchingGlobalSegment(segment, globals)

      expect(match).toBeUndefined()
    })
  })

  describe('getSegmentLabel', () => {
    it('should return global name for exact match', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 100, name: 'Living Room' })]
      const segment = createWledSegment({ start: 0, stop: 100 })

      const label = getSegmentLabel(segment, globals)

      expect(label.display).toBe('Living Room')
      expect(label.tooltip).toBeUndefined()
    })

    it('should truncate long names with tooltip', () => {
      const globals = [
        createGlobalSegment({
          start: 0,
          stop: 100,
          name: 'Very Long Segment Name That Needs Truncation',
        }),
      ]
      const segment = createWledSegment({ start: 0, stop: 100 })

      const label = getSegmentLabel(segment, globals, 20)

      expect(label.display).toBe('Very Long Segment Na…')
      expect(label.tooltip).toBe('Very Long Segment Name That Needs Truncation')
    })

    it("prefers the segment's own name over a matching global segment", () => {
      const globals = [createGlobalSegment({ start: 0, stop: 100, name: 'Living Room' })]
      const segment = createWledSegment({ start: 0, stop: 100, n: 'Couch' })

      expect(getSegmentLabel(segment, globals).display).toBe('Couch')
    })

    it('ignores a name of only spaces', () => {
      const segment = createWledSegment({ id: 2, n: '   ' })

      expect(getSegmentLabel(segment, []).display).toBe('Segment 3')
    })

    it('should use segment.n without a matching global segment', () => {
      const globals: GlobalSegment[] = []
      const segment = createWledSegment({ id: 5, n: 'Custom Name' })

      const label = getSegmentLabel(segment, globals)

      expect(label.display).toBe('Custom Name')
    })

    it('should use "Segment X" as final fallback', () => {
      const globals: GlobalSegment[] = []
      const segment = createWledSegment({ id: 3 })

      const label = getSegmentLabel(segment, globals)

      // UI displays 1-based segment numbers
      expect(label.display).toBe('Segment 4')
    })

    it('should truncate fallback names if needed', () => {
      const globals: GlobalSegment[] = []
      const segment = createWledSegment({
        id: 1,
        n: 'Very Long Custom Segment Name',
      })

      const label = getSegmentLabel(segment, globals, 15)

      expect(label.display).toBe('Very Long Custo…')
      expect(label.tooltip).toBe('Very Long Custom Segment Name')
    })
  })
})
