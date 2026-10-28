import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getWledApi, type WledApi } from '@/api/wled'
import type { ParsedPreset, WledPlaylist, WledPreset } from '@/types/wled'
import { getQueryKeys } from './useQueryKeys'
import { useWledApiMutation } from './useWledApiMutation'

type SavePresetOptions = NonNullable<Parameters<WledApi['savePreset']>[2]>

/**
 * Parse the presets file into an array of presets with IDs.
 * `playlist` is the first preset that is a playlist (the one the playlist
 * screen edits); playlists stay in `presets` so they can be scheduled.
 */
function parsePresets(presetsFile: Record<string, unknown>): {
  presets: ParsedPreset[]
  playlist: ParsedPreset | null
} {
  const presets: ParsedPreset[] = []

  for (const [key, value] of Object.entries(presetsFile)) {
    // Parse numeric keys as preset IDs
    const id = parseInt(key, 10)
    if (Number.isNaN(id) || id < 1 || id > 250) continue

    const preset = value as WledPreset
    // Skip empty/invalid presets
    if (!preset || typeof preset !== 'object' || !preset.n) continue

    presets.push({
      ...preset,
      id,
    })
  }

  // Sort by ID
  presets.sort((a, b) => a.id - b.id)

  return { presets, playlist: presets.find((p) => p.playlist) ?? null }
}

/**
 * Fetch and parse presets from the WLED device
 */
export function usePresets(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  const {
    data: rawPresets,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: keys.presets,
    queryFn: () => api.getPresets(),
    staleTime: 30000, // Presets don't change frequently
  })

  const { presets, playlist } = useMemo(() => {
    if (!rawPresets) return { presets: [], playlist: null }
    return parsePresets(rawPresets)
  }, [rawPresets])

  return {
    presets,
    playlist,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

/**
 * Save the current state as a preset
 */
export function useSavePreset(baseUrl: string) {
  return useWledApiMutation(
    baseUrl,
    (api, { id, name, ...options }: { id: number; name: string } & SavePresetOptions) =>
      api.savePreset(id, name, options),
    // Saving also applies the preset's segments
    (keys) => [keys.presets, keys.stateInfo],
  )
}

/**
 * Delete a preset
 */
export function useDeletePreset(baseUrl: string) {
  return useWledApiMutation(
    baseUrl,
    (api, presetId: number) => api.deletePreset(presetId),
    (keys) => [keys.presets],
  )
}

/**
 * Find the next available preset ID
 */
export function useNextPresetId(baseUrl: string): number | null {
  const { presets, isLoading } = usePresets(baseUrl)

  if (isLoading) return null

  // Find the first unused ID from 1-250
  const usedIds = new Set(presets.map((p) => p.id))
  for (let i = 1; i <= 250; i++) {
    if (!usedIds.has(i)) return i
  }

  return null // All 250 slots are full
}

/**
 * Reset all presets (useful when presets.json is corrupted)
 */
export function useResetPresets(baseUrl: string) {
  return useWledApiMutation(
    baseUrl,
    (api) => api.resetAllPresets(),
    (keys) => [keys.presets],
  )
}

/**
 * Save a playlist (a preset with a `playlist` property)
 */
export function useSavePlaylist(baseUrl: string) {
  return useWledApiMutation(
    baseUrl,
    (api, { id, name, playlist }: { id: number; name: string; playlist: WledPlaylist }) =>
      api.savePlaylist(id, name, playlist),
    (keys) => [keys.presets],
  )
}
