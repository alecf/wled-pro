import { useMemo } from 'react'
import { useWledEffects, useWledEffectData } from './useWled'
import { parseEffects, type Effect } from '@/lib/effects'

interface UseEffectsResult {
  effects: Effect[] | undefined
  isLoading: boolean
  error: Error | null
}

/**
 * Fetch and parse effect data from WLED.
 *
 * Combines /json/eff (effect names) and /json/fxdata (effect metadata)
 * into a developer-friendly array of Effect objects with parsed parameters,
 * colors, palette support, and flags.
 *
 * Both underlying queries are cached indefinitely since effect data
 * only changes on firmware update.
 */
export function useEffects(baseUrl: string): UseEffectsResult {
  const {
    data: names,
    isLoading: namesLoading,
    error: namesError,
  } = useWledEffects(baseUrl)

  const {
    data: fxdata,
    isLoading: fxdataLoading,
    error: fxdataError,
  } = useWledEffectData(baseUrl)

  const effects = useMemo(() => {
    if (!names || !fxdata) return undefined
    return parseEffects(names, fxdata)
  }, [names, fxdata])

  return {
    effects,
    isLoading: namesLoading || fxdataLoading,
    error: namesError ?? fxdataError ?? null,
  }
}
