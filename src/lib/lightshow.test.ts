import { describe, expect, it } from 'vitest'
import { createDefaultSegment, globalSegmentsToWledSegments, hasOneBigSegment } from './lightshow'
import { toSegment } from './segmentUtils'

describe('hasOneBigSegment', () => {
  it('is true for one segment covering at least 90% of the strip from LED 0', () => {
    expect(hasOneBigSegment([toSegment({ start: 0, stop: 100 }, 0)], 100)).toBe(true)
    expect(hasOneBigSegment([toSegment({ start: 0, stop: 90 }, 0)], 100)).toBe(true)
  })

  it('is false for a short segment, one not starting at 0, or several segments', () => {
    expect(hasOneBigSegment([toSegment({ start: 0, stop: 89 }, 0)], 100)).toBe(false)
    expect(hasOneBigSegment([toSegment({ start: 5, stop: 100 }, 0)], 100)).toBe(false)
    expect(
      hasOneBigSegment(
        [toSegment({ start: 0, stop: 50 }, 0), toSegment({ start: 50, stop: 100 }, 1)],
        100,
      ),
    ).toBe(false)
  })
})

describe('createDefaultSegment', () => {
  it('covers the whole strip in orange', () => {
    expect(createDefaultSegment(150)).toMatchObject({
      id: 0,
      start: 0,
      stop: 150,
      len: 150,
      fx: 0,
      col: [[255, 160, 0]],
    })
  })
})

describe('globalSegmentsToWledSegments', () => {
  const layout = [
    { id: 'a', start: 0, stop: 40, name: 'Kitchen' },
    { id: 'b', start: 40, stop: 100, name: 'Hall' },
  ]

  it('makes one named WLED segment per global segment with ids 0..n-1', () => {
    const segments = globalSegmentsToWledSegments(layout)
    expect(segments.map(({ id, start, stop, n }) => ({ id, start, stop, n }))).toEqual([
      { id: 0, start: 0, stop: 40, n: 'Kitchen' },
      { id: 1, start: 40, stop: 100, n: 'Hall' },
    ])
    expect(segments[0]).toMatchObject({ fx: 0, bri: 255, col: [[255, 160, 0]] })
  })

  it("copies the template segment's effect and colors to every segment", () => {
    const template = toSegment({ start: 0, stop: 100, fx: 9, sx: 200, pal: 6, col: [[1, 2, 3]] }, 0)
    for (const seg of globalSegmentsToWledSegments(layout, template)) {
      expect(seg).toMatchObject({ fx: 9, sx: 200, pal: 6, col: [[1, 2, 3]] })
    }
  })
})
