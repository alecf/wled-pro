import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useControllerContext } from '@/contexts/ControllerContext'
import { formatDuration } from '@/lib/format'
import type { NightlightState } from '@/types/wled'

type SleepTimerSettings = Pick<NightlightState, 'dur' | 'mode' | 'tbri'>

/**
 * Start or stop the device's sleep timer (nightlight) with the given settings, over the
 * shared connection, with a toast for the result. `pending` is the action in flight, if any.
 */
export function useSleepTimer() {
  const { send } = useControllerContext()
  const [pending, setPending] = useState<'start' | 'stop' | null>(null)

  const setRunning = useCallback(
    async (on: boolean, { dur, mode, tbri }: SleepTimerSettings) => {
      setPending(on ? 'start' : 'stop')
      try {
        // Settings go with the start, so the timer runs with what the screen shows
        await send({ nl: { on, dur, mode, tbri } })
        toast.success(on ? `Timer started for ${formatDuration(dur)}` : 'Timer cancelled')
      } catch (error) {
        toast.error(`Failed to ${on ? 'start' : 'stop'} timer`)
        console.error(error)
      } finally {
        setPending(null)
      }
    },
    [send],
  )

  return {
    start: useCallback((settings: SleepTimerSettings) => setRunning(true, settings), [setRunning]),
    stop: useCallback((settings: SleepTimerSettings) => setRunning(false, settings), [setRunning]),
    pending,
  }
}
