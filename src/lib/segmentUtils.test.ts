import { describe, it, expect } from 'vitest'
import {
  segmentsToRangeItems,
  mergeSegments,
  mergeGapUp,
  mergeGapDown,
  convertGapToSegment,
  findNextAvailableSegmentId,
} from './segmentUtils'
import type { Segment } from '@/types/wled'

// Helper to create a test segment
function createSegment(overrides?: Partial<Segment>): Segment {
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
    col: [[255, 255, 255], [0, 0, 0], [0, 0, 0]],
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

describe('segmentUtils', () => {
  describe('segmentsToRangeItems', () => {
    it('should create no gaps when segments cover full range', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
      ]
      const items = segmentsToRangeItems(segments, 200)

      expect(items).toHaveLength(2)
      expect(items[0].type).toBe('segment')
      expect(items[1].type).toBe('segment')
    })

    it('should create gaps between segments', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 150, stop: 200 }),
      ]
      const items = segmentsToRangeItems(segments, 200)

      expect(items).toHaveLength(3)
      expect(items[0].type).toBe('segment')
      expect(items[1].type).toBe('gap')
      expect(items[1].type === 'gap' && items[1].start).toBe(100)
      expect(items[1].type === 'gap' && items[1].stop).toBe(150)
      expect(items[2].type).toBe('segment')
    })

    it('should create leading gap when first segment does not start at 0', () => {
      const segments = [createSegment({ id: 0, start: 50, stop: 100 })]
      const items = segmentsToRangeItems(segments, 200)

      expect(items).toHaveLength(3)
      expect(items[0].type).toBe('gap')
      expect(items[0].type === 'gap' && items[0].start).toBe(0)
      expect(items[0].type === 'gap' && items[0].stop).toBe(50)
      expect(items[1].type).toBe('segment')
      expect(items[2].type).toBe('gap')
    })

    it('should create trailing gap when last segment does not reach maxLedCount', () => {
      const segments = [createSegment({ id: 0, start: 0, stop: 50 })]
      const items = segmentsToRangeItems(segments, 200)

      expect(items).toHaveLength(2)
      expect(items[0].type).toBe('segment')
      expect(items[1].type).toBe('gap')
      expect(items[1].type === 'gap' && items[1].start).toBe(50)
      expect(items[1].type === 'gap' && items[1].stop).toBe(200)
    })

    it('should sort segments by start position', () => {
      const segments = [
        createSegment({ id: 1, start: 100, stop: 150 }),
        createSegment({ id: 0, start: 0, stop: 50 }),
      ]
      const items = segmentsToRangeItems(segments, 200)

      expect(items[0].type).toBe('segment')
      expect(items[0].type === 'segment' && items[0].segment.id).toBe(0)
      expect(items[1].type).toBe('gap')
      expect(items[2].type).toBe('segment')
      expect(items[2].type === 'segment' && items[2].segment.id).toBe(1)
    })
  })

  describe('mergeSegments', () => {
    it('should merge adjacent segments', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
      ]
      const result = mergeSegments(segments, 0, 1)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(0)
      expect(result[0].start).toBe(0)
      expect(result[0].stop).toBe(200)
    })

    it('should merge overlapping segments', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 150 }),
        createSegment({ id: 1, start: 50, stop: 200 }),
      ]
      const result = mergeSegments(segments, 0, 1)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(0)
      expect(result[0].start).toBe(0)
      expect(result[0].stop).toBe(200)
    })

    it('should merge segments with gap between them', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 150, stop: 250 }),
      ]
      const result = mergeSegments(segments, 0, 1)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(0)
      expect(result[0].start).toBe(0)
      expect(result[0].stop).toBe(250)
    })

    it('should keep properties of the keep segment', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100, fx: 5, bri: 200 }),
        createSegment({ id: 1, start: 100, stop: 200, fx: 10, bri: 100 }),
      ]
      const result = mergeSegments(segments, 0, 1)

      expect(result[0].fx).toBe(5)
      expect(result[0].bri).toBe(200)
    })

    it('should return unchanged segments if keepId not found', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
      ]
      const result = mergeSegments(segments, 999, 1)

      expect(result).toEqual(segments)
    })
  })

  describe('mergeGapUp', () => {
    it('should extend segment above to fill gap', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 150, stop: 250 }),
      ]
      const result = mergeGapUp(segments, 100, 150)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(0)
      expect(result[0].stop).toBe(150)
      expect(result[1].id).toBe(1)
      expect(result[1].start).toBe(150)
    })

    it('should return unchanged if no segment above gap', () => {
      const segments = [createSegment({ id: 0, start: 50, stop: 100 })]
      const result = mergeGapUp(segments, 0, 50)

      expect(result).toEqual(segments)
    })
  })

  describe('mergeGapDown', () => {
    it('should extend segment below to fill gap', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 150, stop: 250 }),
      ]
      const result = mergeGapDown(segments, 100, 150)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(0)
      expect(result[0].stop).toBe(100)
      expect(result[1].id).toBe(1)
      expect(result[1].start).toBe(100)
    })

    it('should return unchanged if no segment below gap', () => {
      const segments = [createSegment({ id: 0, start: 0, stop: 100 })]
      const result = mergeGapDown(segments, 100, 200)

      expect(result).toEqual(segments)
    })
  })

  describe('convertGapToSegment', () => {
    it('should create new segment in gap', () => {
      const segments = [createSegment({ id: 0, start: 0, stop: 100 })]
      const result = convertGapToSegment(segments, 100, 200)

      expect(result).toHaveLength(2)
      expect(result[1].start).toBe(100)
      expect(result[1].stop).toBe(200)
      expect(result[1].id).toBe(1)
    })

    it('should find first available ID', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 100, stop: 200 }),
        createSegment({ id: 2, start: 200, stop: 300 }),
      ]
      const result = convertGapToSegment(segments, 300, 400)

      expect(result[3].id).toBe(3)
    })

    it('should create segment with default properties', () => {
      const segments = [createSegment({ id: 0, start: 0, stop: 100 })]
      const result = convertGapToSegment(segments, 100, 200)

      const newSegment = result[1]
      expect(newSegment.on).toBe(true)
      expect(newSegment.bri).toBe(255)
      expect(newSegment.fx).toBe(0) // Solid
      expect(newSegment.col[0]).toEqual([255, 255, 255]) // White
    })

    it('should maintain sorted order', () => {
      const segments = [
        createSegment({ id: 1, start: 200, stop: 300 }),
        createSegment({ id: 0, start: 0, stop: 100 }),
      ]
      const result = convertGapToSegment(segments, 100, 200)

      expect(result[0].id).toBe(0)
      expect(result[1].start).toBe(100)
      expect(result[2].id).toBe(1)
    })
  })

  describe('findNextAvailableSegmentId', () => {
    it('should find first available ID', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 2, start: 100, stop: 200 }),
      ]
      const nextId = findNextAvailableSegmentId(segments)

      expect(nextId).toBe(1)
    })

    it('should return -1 when all IDs are used', () => {
      const segments = Array.from({ length: 10 }, (_, i) =>
        createSegment({ id: i, start: i * 100, stop: (i + 1) * 100 }),
      )
      const nextId = findNextAvailableSegmentId(segments)

      expect(nextId).toBe(-1)
    })

    it('should return 0 for empty segments', () => {
      const nextId = findNextAvailableSegmentId([])

      expect(nextId).toBe(0)
    })
  })

  describe('integration tests', () => {
    it('should handle complex segment operations', () => {
      // Start with 3 segments with gaps
      let segments = [
        createSegment({ id: 0, start: 0, stop: 100 }),
        createSegment({ id: 1, start: 150, stop: 250 }),
        createSegment({ id: 2, start: 300, stop: 400 }),
      ]

      // Merge first gap up
      segments = mergeGapUp(segments, 100, 150)
      expect(segmentsToRangeItems(segments, 500).filter((i) => i.type === 'gap'))
        .toHaveLength(2)

      // Merge second gap down
      segments = mergeGapDown(segments, 250, 300)
      expect(segmentsToRangeItems(segments, 500).filter((i) => i.type === 'gap'))
        .toHaveLength(1)

      // Convert remaining gap to segment
      segments = convertGapToSegment(segments, 400, 500)
      expect(segmentsToRangeItems(segments, 500).filter((i) => i.type === 'gap'))
        .toHaveLength(0)
    })

    it('should handle overlapping segment merge correctly', () => {
      const segments = [
        createSegment({ id: 0, start: 0, stop: 150 }),
        createSegment({ id: 1, start: 100, stop: 250 }),
        createSegment({ id: 2, start: 200, stop: 350 }),
      ]

      // Merge overlapping segments
      let merged = mergeSegments(segments, 0, 1)
      merged = mergeSegments(merged, 0, 2)

      expect(merged).toHaveLength(1)
      expect(merged[0].start).toBe(0)
      expect(merged[0].stop).toBe(350)
    })
  })
})
