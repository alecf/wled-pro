import { describe, expect, it } from 'vitest'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'
import {
  assignSegmentToGroup,
  createGroup,
  deleteGroup,
  mergeSegmentsByIds,
  splitSegmentAtPosition,
  updateGroup,
  validateMerge,
  validateSplitPosition,
} from './segmentDefinitions'

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

describe('segmentDefinitions', () => {
  describe('Validation', () => {
    describe('validateSplitPosition', () => {
      it('should accept valid split positions', () => {
        const segment = createGlobalSegment({ start: 0, stop: 100 })
        const result = validateSplitPosition(segment, 50)
        expect(result.valid).toBe(true)
      })

      it('should reject split at segment start', () => {
        const segment = createGlobalSegment({ start: 0, stop: 100 })
        const result = validateSplitPosition(segment, 0)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('must be between')
      })

      it('should reject split at segment end', () => {
        const segment = createGlobalSegment({ start: 0, stop: 100 })
        const result = validateSplitPosition(segment, 100)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('must be between')
      })

      it('should reject split creating empty segment', () => {
        const segment = createGlobalSegment({ start: 0, stop: 2 })
        expect(validateSplitPosition(segment, 1).valid).toBe(true)
        expect(validateSplitPosition(segment, 0).valid).toBe(false)
        expect(validateSplitPosition(segment, 2).valid).toBe(false)
      })
    })

    describe('validateMerge', () => {
      it('should accept adjacent segments', () => {
        const seg1 = createGlobalSegment({ start: 0, stop: 100 })
        const seg2 = createGlobalSegment({ start: 100, stop: 200 })
        const result = validateMerge(seg1, seg2)
        expect(result.valid).toBe(true)
      })

      it('should accept adjacent segments in reverse order', () => {
        const seg1 = createGlobalSegment({ start: 100, stop: 200 })
        const seg2 = createGlobalSegment({ start: 0, stop: 100 })
        const result = validateMerge(seg1, seg2)
        expect(result.valid).toBe(true)
      })

      it('should reject non-adjacent segments', () => {
        const seg1 = createGlobalSegment({ start: 0, stop: 100 })
        const seg2 = createGlobalSegment({ start: 200, stop: 300 })
        const result = validateMerge(seg1, seg2)
        expect(result.valid).toBe(false)
        expect(result.error).toContain('not adjacent')
      })
    })
  })

  describe('Split Operations', () => {
    it('should split a segment at position', () => {
      const segments = [createGlobalSegment({ start: 0, stop: 100, name: 'Original' })]
      const result = splitSegmentAtPosition(segments, segments[0].id, 50)

      expect(result).toHaveLength(2)
      expect(result[0].start).toBe(0)
      expect(result[0].stop).toBe(50)
      expect(result[0].name).toBe('Original')
      expect(result[1].start).toBe(50)
      expect(result[1].stop).toBe(100)
      expect(result[1].name).toBe('Original (2)')
    })

    it('should throw on invalid split position', () => {
      const segments = [createGlobalSegment({ start: 0, stop: 100 })]
      expect(() => splitSegmentAtPosition(segments, segments[0].id, 0)).toThrow()
    })

    it('should not split other segments', () => {
      const segments = [
        createGlobalSegment({ id: '1', start: 0, stop: 100, name: 'First' }),
        createGlobalSegment({ id: '2', start: 100, stop: 200, name: 'Second' }),
      ]
      const result = splitSegmentAtPosition(segments, '1', 50)

      expect(result).toHaveLength(3)
      expect(result.find((s) => s.name === 'Second')).toBeDefined()
    })
  })

  describe('Merge Operations', () => {
    it('should merge two adjacent segments', () => {
      const segments = [
        createGlobalSegment({ id: '1', start: 0, stop: 100, name: 'First' }),
        createGlobalSegment({ id: '2', start: 100, stop: 200, name: 'Second' }),
      ]
      const result = mergeSegmentsByIds(segments, '1', '2', 'Merged')

      expect(result).toHaveLength(1)
      expect(result[0].start).toBe(0)
      expect(result[0].stop).toBe(200)
      expect(result[0].name).toBe('Merged')
    })

    it('should merge in reverse order', () => {
      const segments = [
        createGlobalSegment({ id: '1', start: 0, stop: 100 }),
        createGlobalSegment({ id: '2', start: 100, stop: 200 }),
      ]
      const result = mergeSegmentsByIds(segments, '2', '1', 'Merged')

      expect(result).toHaveLength(1)
      expect(result[0].start).toBe(0)
      expect(result[0].stop).toBe(200)
    })

    it('should throw on non-adjacent segments', () => {
      const segments = [
        createGlobalSegment({ id: '1', start: 0, stop: 100 }),
        createGlobalSegment({ id: '2', start: 200, stop: 300 }),
      ]
      expect(() => mergeSegmentsByIds(segments, '1', '2', 'Merged')).toThrow('not adjacent')
    })

    it('should inherit group from first segment', () => {
      const segments = [
        createGlobalSegment({ id: '1', start: 0, stop: 100, groupId: 'group-1' }),
        createGlobalSegment({ id: '2', start: 100, stop: 200, groupId: 'group-2' }),
      ]
      const result = mergeSegmentsByIds(segments, '1', '2', 'Merged')

      expect(result[0].groupId).toBe('group-1')
    })
  })

  describe('Group Operations', () => {
    it('should create a new group', () => {
      const groups: SegmentGroup[] = []
      const result = createGroup(groups, 'Test Group')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Test Group')
      expect(result[0].id).toBeDefined()
    })

    it('should update group name', () => {
      const groups = [{ id: 'g1', name: 'Original' }]
      const result = updateGroup(groups, 'g1', 'Updated')

      expect(result[0].name).toBe('Updated')
    })

    it('should delete group and unassign segments', () => {
      const groups = [{ id: 'g1', name: 'Group' }]
      const segments = [
        createGlobalSegment({ id: 's1', groupId: 'g1' }),
        createGlobalSegment({ id: 's2', groupId: 'g1' }),
        createGlobalSegment({ id: 's3', groupId: 'g2' }),
      ]

      const result = deleteGroup(groups, segments, 'g1')

      expect(result.groups).toHaveLength(0)
      expect(result.segments.find((s) => s.id === 's1')?.groupId).toBeUndefined()
      expect(result.segments.find((s) => s.id === 's2')?.groupId).toBeUndefined()
      expect(result.segments.find((s) => s.id === 's3')?.groupId).toBe('g2')
    })

    it('should assign segment to group', () => {
      const segments = [createGlobalSegment({ id: 's1' })]
      const result = assignSegmentToGroup(segments, 's1', 'group-1')

      expect(result[0].groupId).toBe('group-1')
    })

    it('should unassign segment from group', () => {
      const segments = [createGlobalSegment({ id: 's1', groupId: 'group-1' })]
      const result = assignSegmentToGroup(segments, 's1', undefined)

      expect(result[0].groupId).toBeUndefined()
    })
  })
})
