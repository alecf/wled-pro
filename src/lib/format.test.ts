import { describe, expect, it } from 'vitest'
import { formatDuration, formatUptime } from './format'

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

describe('formatUptime', () => {
  it.each([
    [0, '0s'],
    [45, '45s'],
    [12 * 60 + 5, '12m'],
    [3600, '1h'],
    [5 * 3600 + 12 * 60, '5h 12m'],
    [86400, '1d'],
    [6913 * 3600 + 13 * 60, '288d 1h'],
  ])('%i seconds -> %s', (seconds, expected) => {
    expect(formatUptime(seconds)).toBe(expected)
  })
})
