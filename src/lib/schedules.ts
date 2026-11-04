/** WLED timer day bits (`dow`): Monday is bit 0, Sunday bit 6 */
export const DAYS_OF_WEEK = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 4 },
  { label: 'Thu', value: 8 },
  { label: 'Fri', value: 16 },
  { label: 'Sat', value: 32 },
  { label: 'Sun', value: 64 },
] as const

/**
 * When a WLED timer fires: "7:30 AM", "Every hour at :15", or for the sunrise/sunset slots
 * (where `min` is an offset) "+10 minutes".
 */
export function formatScheduleTime(hour: number, min: number, isSunriseSunset: boolean): string {
  if (isSunriseSunset) {
    if (min === 0) return 'Exactly at sunrise/sunset'
    const sign = min > 0 ? '+' : ''
    return `${sign}${min} minutes`
  }

  if (hour === 24) {
    return `Every hour at :${min.toString().padStart(2, '0')}`
  }

  const h = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h}:${min.toString().padStart(2, '0')} ${ampm}`
}

/** The days a timer runs on (`dow` bits): "Every day", "Weekdays", "Mon, Wed" */
export function formatDaysOfWeek(dow: number): string {
  if (dow === 127) return 'Every day'
  if (dow === 31) return 'Weekdays'
  if (dow === 96) return 'Weekends'

  const days = DAYS_OF_WEEK.filter(({ value }) => dow & value).map(({ label }) => label)
  return days.join(', ') || 'Never'
}
