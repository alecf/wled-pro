import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWledApi } from '@/api/wled'
import type { ParsedPreset, WledPreset, WledPlaylist } from '@/types/wled'

const getPresetsQueryKey = (baseUrl: string) => ['wled', baseUrl, 'presets'] as const
const getStateQueryKey = (baseUrl: string) => ['wled', baseUrl, 'state'] as const

/**
 * Parse the presets file into an array of presets with IDs
 */
function parsePresets(
  presetsFile: Record<string, unknown>
): { presets: ParsedPreset[]; playlist: WledPlaylist | null } {
  const presets: ParsedPreset[] = []
  let playlist: WledPlaylist | null = null

  for (const [key, value] of Object.entries(presetsFile)) {
    // Skip non-preset entries
    if (key === 'playlist') {
      const playlistEntry = value as { playlist?: WledPlaylist }
      if (playlistEntry.playlist) {
        playlist = playlistEntry.playlist
      }
      continue
    }

    // Parse numeric keys as preset IDs
    const id = parseInt(key, 10)
    if (isNaN(id) || id < 1 || id > 250) continue

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

  return { presets, playlist }
}

/**
 * Fetch and parse presets from the WLED device
 */
export function usePresets(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const queryKey = getPresetsQueryKey(baseUrl)

  const { data: rawPresets, isLoading, error, refetch } = useQuery({
    queryKey,
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
 * Load a preset by ID
 */
export function useLoadPreset(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const stateKey = getStateQueryKey(baseUrl)

  return useMutation({
    mutationFn: (presetId: number) => api.loadPreset(presetId),
    onSuccess: () => {
      // Invalidate state to reflect the loaded preset
      queryClient.invalidateQueries({ queryKey: stateKey })
    },
  })
}

/**
 * Save the current state as a preset
 */
export function useSavePreset(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const presetsKey = getPresetsQueryKey(baseUrl)

  return useMutation({
    mutationFn: ({
      id,
      name,
      quickLabel,
    }: {
      id: number
      name: string
      quickLabel?: string
    }) => api.savePreset(id, name, { quickLabel }),
    onSuccess: () => {
      // Invalidate presets to show the new/updated preset
      queryClient.invalidateQueries({ queryKey: presetsKey })
    },
  })
}

/**
 * Delete a preset
 */
export function useDeletePreset(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const presetsKey = getPresetsQueryKey(baseUrl)

  return useMutation({
    mutationFn: (presetId: number) => api.deletePreset(presetId),
    onSuccess: () => {
      // Invalidate presets to remove the deleted preset
      queryClient.invalidateQueries({ queryKey: presetsKey })
    },
  })
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
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const presetsKey = getPresetsQueryKey(baseUrl)

  return useMutation({
    mutationFn: () => api.resetAllPresets(),
    onSuccess: () => {
      // Invalidate presets to reflect the empty state
      queryClient.invalidateQueries({ queryKey: presetsKey })
    },
  })
}
