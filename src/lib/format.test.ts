import { describe, expect, it } from 'vitest'
import { formatDuration } from './format'

describe('formatDuration', () => {
  it.each([
    [1, '1 minute'],
    [45, '45 minutes'],
    [60, '1 hour'],
    [120, '2 hours'],
    [90, '1h 30m'],
  ])('%i minutes -> %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})
