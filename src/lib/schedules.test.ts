import { describe, expect, it } from 'vitest'
import { formatDaysOfWeek, formatScheduleTime } from './schedules'

describe('formatScheduleTime', () => {
  it('formats clock times in 12-hour time', () => {
    expect(formatScheduleTime(0, 5, false)).toBe('12:05 AM')
    expect(formatScheduleTime(13, 30, false)).toBe('1:30 PM')
  })

  it('formats hourly timers and sunrise/sunset offsets', () => {
    expect(formatScheduleTime(24, 15, false)).toBe('Every hour at :15')
    expect(formatScheduleTime(255, 0, true)).toBe('Exactly at sunrise/sunset')
    expect(formatScheduleTime(255, 10, true)).toBe('+10 minutes')
    expect(formatScheduleTime(255, -5, true)).toBe('-5 minutes')
  })
})

describe('formatDaysOfWeek', () => {
  it('names common day sets', () => {
    expect(formatDaysOfWeek(127)).toBe('Every day')
    expect(formatDaysOfWeek(31)).toBe('Weekdays')
    expect(formatDaysOfWeek(96)).toBe('Weekends')
  })

  it('lists other days, Monday first', () => {
    expect(formatDaysOfWeek(1 | 4 | 64)).toBe('Mon, Wed, Sun')
    expect(formatDaysOfWeek(0)).toBe('Never')
  })
})
