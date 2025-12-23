import { describe, it, expect } from 'vitest'
import {
  findMatchingGlobalSegment,
  getSegmentLabel,
  labelSegments,
  hasMatchingDefinitions,
  getMatchStatistics,
} from './segmentLabeling'
import type { GlobalSegment } from '@/types/segments'
import type { Segment } from '@/types/wled'

// Helper to create a test global segment
function createGlobalSegment(
  overrides?: Partial<GlobalSegment>
): GlobalSegment {
  return {
    id: crypto.randomUUID(),
    controllerId: 'test-controller',
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
      const globals = [
        createGlobalSegment({ start: 0, stop: 100, name: 'Living Room' }),
      ]
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

    it('should use segment.n as fallback', () => {
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

  describe('labelSegments', () => {
    it('should label multiple segments', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Zone 1' }),
        createGlobalSegment({ start: 50, stop: 100, name: 'Zone 2' }),
      ]
      const segments = [
        createWledSegment({ id: 0, start: 0, stop: 50 }),
        createWledSegment({ id: 1, start: 50, stop: 100 }),
      ]

      const labels = labelSegments(segments, globals)

      expect(labels.size).toBe(2)
      expect(labels.get(0)?.display).toBe('Zone 1')
      expect(labels.get(1)?.display).toBe('Zone 2')
    })

    it('should handle mix of matched and unmatched', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 50, name: 'Zone 1' })]
      const segments = [
        createWledSegment({ id: 0, start: 0, stop: 50 }),
        createWledSegment({ id: 1, start: 50, stop: 100 }),
      ]

      const labels = labelSegments(segments, globals)

      expect(labels.get(0)?.display).toBe('Zone 1')
      // UI displays 1-based segment numbers
      expect(labels.get(1)?.display).toBe('Segment 2')
    })
  })

  describe('hasMatchingDefinitions', () => {
    it('should return true when matches exist', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 50 })]
      const segments = [createWledSegment({ start: 0, stop: 50 })]

      expect(hasMatchingDefinitions(segments, globals)).toBe(true)
    })

    it('should return false when no matches', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 50 })]
      const segments = [createWledSegment({ start: 50, stop: 100 })]

      expect(hasMatchingDefinitions(segments, globals)).toBe(false)
    })

    it('should return true if at least one segment matches', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 50 })]
      const segments = [
        createWledSegment({ start: 0, stop: 50 }),
        createWledSegment({ start: 50, stop: 100 }),
      ]

      expect(hasMatchingDefinitions(segments, globals)).toBe(true)
    })
  })

  describe('getMatchStatistics', () => {
    it('should calculate correct statistics', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50 }),
        createGlobalSegment({ start: 50, stop: 100 }),
      ]
      const segments = [
        createWledSegment({ start: 0, stop: 50 }),
        createWledSegment({ start: 50, stop: 100 }),
        createWledSegment({ start: 100, stop: 150 }),
      ]

      const stats = getMatchStatistics(segments, globals)

      expect(stats.total).toBe(3)
      expect(stats.matched).toBe(2)
      expect(stats.unmatched).toBe(1)
      expect(stats.matchRate).toBeCloseTo(66.67, 1)
    })

    it('should handle empty segments', () => {
      const globals = [createGlobalSegment()]
      const segments: Segment[] = []

      const stats = getMatchStatistics(segments, globals)

      expect(stats.total).toBe(0)
      expect(stats.matched).toBe(0)
      expect(stats.unmatched).toBe(0)
      expect(stats.matchRate).toBe(0)
    })

    it('should handle 100% match rate', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50 }),
        createGlobalSegment({ start: 50, stop: 100 }),
      ]
      const segments = [
        createWledSegment({ start: 0, stop: 50 }),
        createWledSegment({ start: 50, stop: 100 }),
      ]

      const stats = getMatchStatistics(segments, globals)

      expect(stats.matchRate).toBe(100)
    })
  })

  describe('Performance', () => {
    it('should handle large number of segments efficiently', () => {
      const globals = Array.from({ length: 100 }, (_, i) =>
        createGlobalSegment({
          start: i * 10,
          stop: (i + 1) * 10,
          name: `Zone ${i}`,
        })
      )
      const segments = Array.from({ length: 100 }, (_, i) =>
        createWledSegment({
          id: i,
          start: i * 10,
          stop: (i + 1) * 10,
        })
      )

      const startTime = performance.now()
      const labels = labelSegments(segments, globals)
      const endTime = performance.now()

      expect(labels.size).toBe(100)
      expect(endTime - startTime).toBeLessThan(10) // Should be < 10ms
    })
  })
})
