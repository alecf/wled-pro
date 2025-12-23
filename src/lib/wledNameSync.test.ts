import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createNameSyncUpdate,
  needsNameSync,
  getSegmentsToSync,
  syncSegmentNames,
} from './wledNameSync'
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

describe('wledNameSync', () => {
  describe('createNameSyncUpdate', () => {
    it('should create update for mismatched names', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Old Name' }),
      ]

      const update = createNameSyncUpdate(actives, globals)

      expect(update.seg).toHaveLength(1)
      expect(update.seg?.[0]).toEqual({
        id: 0,
        n: 'Living Room',
      })
    })

    it('should not update if names already match', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Living Room' }),
      ]

      const update = createNameSyncUpdate(actives, globals)

      expect(update.seg).toHaveLength(0)
    })

    it('should handle segments without global definitions', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 50 })]
      const actives = [
        createWledSegment({ id: 0, start: 50, stop: 100, n: 'No Match' }),
      ]

      const update = createNameSyncUpdate(actives, globals)

      expect(update.seg).toHaveLength(0)
    })

    it('should update multiple segments', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Zone 1' }),
        createGlobalSegment({ start: 50, stop: 100, name: 'Zone 2' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Old 1' }),
        createWledSegment({ id: 1, start: 50, stop: 100, n: 'Old 2' }),
      ]

      const update = createNameSyncUpdate(actives, globals)

      expect(update.seg).toHaveLength(2)
      expect(update.seg?.[0]).toEqual({ id: 0, n: 'Zone 1' })
      expect(update.seg?.[1]).toEqual({ id: 1, n: 'Zone 2' })
    })

    it('should handle segments without names', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [createWledSegment({ id: 0, start: 0, stop: 50 })]

      const update = createNameSyncUpdate(actives, globals)

      expect(update.seg).toHaveLength(1)
      expect(update.seg?.[0]).toEqual({
        id: 0,
        n: 'Living Room',
      })
    })
  })

  describe('needsNameSync', () => {
    it('should return true when names mismatch', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Old Name' }),
      ]

      expect(needsNameSync(actives, globals)).toBe(true)
    })

    it('should return false when names match', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Living Room' }),
      ]

      expect(needsNameSync(actives, globals)).toBe(false)
    })

    it('should return false when no matching definitions', () => {
      const globals = [createGlobalSegment({ start: 0, stop: 50 })]
      const actives = [createWledSegment({ id: 0, start: 50, stop: 100 })]

      expect(needsNameSync(actives, globals)).toBe(false)
    })
  })

  describe('getSegmentsToSync', () => {
    it('should list segments needing sync', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
        createGlobalSegment({ start: 50, stop: 100, name: 'Kitchen' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Old Name' }),
        createWledSegment({ id: 1, start: 50, stop: 100, n: 'Kitchen' }),
      ]

      const toSync = getSegmentsToSync(actives, globals)

      expect(toSync).toHaveLength(1)
      expect(toSync[0]).toEqual({
        id: 0,
        currentName: 'Old Name',
        newName: 'Living Room',
      })
    })

    it('should handle segments without current names', () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [createWledSegment({ id: 0, start: 0, stop: 50 })]

      const toSync = getSegmentsToSync(actives, globals)

      expect(toSync).toHaveLength(1)
      expect(toSync[0]).toEqual({
        id: 0,
        currentName: undefined,
        newName: 'Living Room',
      })
    })
  })

  describe('syncSegmentNames', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      fetchMock = vi.fn()
      global.fetch = fetchMock
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should POST update to /json/state', async () => {
      fetchMock.mockResolvedValue({ ok: true })

      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Old Name' }),
      ]

      const result = await syncSegmentNames(
        'http://192.168.1.100',
        actives,
        globals
      )

      expect(result).toBe(true)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://192.168.1.100/json/state',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seg: [{ id: 0, n: 'Living Room' }],
          }),
        }
      )
    })

    it('should return true when nothing to sync', async () => {
      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Living Room' }),
      ]

      const result = await syncSegmentNames(
        'http://192.168.1.100',
        actives,
        globals
      )

      expect(result).toBe(true)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should return false on network error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'))

      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Old Name' }),
      ]

      const result = await syncSegmentNames(
        'http://192.168.1.100',
        actives,
        globals
      )

      expect(result).toBe(false)
    })

    it('should return false on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false })

      const globals = [
        createGlobalSegment({ start: 0, stop: 50, name: 'Living Room' }),
      ]
      const actives = [
        createWledSegment({ id: 0, start: 0, stop: 50, n: 'Old Name' }),
      ]

      const result = await syncSegmentNames(
        'http://192.168.1.100',
        actives,
        globals
      )

      expect(result).toBe(false)
    })
  })
})
