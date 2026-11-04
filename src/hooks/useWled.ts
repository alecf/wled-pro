import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getWledApi, type WledApi } from '@/api/wled'
import type { ConfigPatch, PaletteWithColors, WledFullConfig, WledPlaylist } from '@/types/wled'
import { getQueryKeys } from './useQueryKeys'

type QueryKeys = ReturnType<typeof getQueryKeys>
const configKeys = (keys: QueryKeys) => [keys.config]

/**
 * Mutation that calls the controller's API and then invalidates the
 * queries `invalidate` returns (not awaited: a save that makes the device
 * reboot or drop WiFi must not wait for the refetch).
 */
function useWledApiMutation<TVariables = void, TResult = unknown>(
  baseUrl: string,
  mutate: (api: WledApi, variables: TVariables) => Promise<TResult>,
  invalidate?: (keys: QueryKeys) => readonly (readonly unknown[])[],
) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useMutation({
    mutationFn: (variables: TVariables) => mutate(api, variables),
    onSuccess: () => {
      for (const queryKey of invalidate?.(keys) ?? []) {
        queryClient.invalidateQueries({ queryKey })
      }
    },
  })
}

export function useWledEffects(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.effects,
    queryFn: () => api.getEffects(),
    staleTime: Infinity,
  })
}

/**
 * Fetch combined state and info in a single request.
 */
export function useWledStateInfo(
  baseUrl: string,
  options: { enabled?: boolean; refetchInterval?: number; retry?: number } = {},
) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.stateInfo,
    queryFn: () => api.getStateInfo(),
    refetchInterval: 5000,
    ...options,
  })
}

/**
 * Fetch effect metadata (parameter labels, flags, defaults).
 * This data is static per firmware version, so it's cached indefinitely.
 */
export function useWledEffectData(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.effectData,
    queryFn: () => api.getEffectData(),
    staleTime: Infinity,
  })
}

/**
 * Fetch all palettes with their names and color data combined.
 * This is the recommended hook for displaying palettes in the UI.
 */
export function useWledPalettesWithColors(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.palettesWithColors,
    queryFn: async (): Promise<PaletteWithColors[]> => {
      // Fetch palette names and colors in parallel
      const [names, colorMap] = await Promise.all([api.getPalettes(), api.getAllPaletteColors()])

      // Combine names with colors
      return names.map((name, id) => ({
        id,
        name,
        colors: colorMap[id.toString()] || [],
      }))
    },
    staleTime: Infinity, // Static per firmware version
  })
}

/**
 * Fetch available WiFi networks.
 * Useful for device setup/configuration UI.
 */
export function useWledNetworks(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.networks,
    queryFn: () => api.getNetworks(),
    staleTime: 10000, // Refresh every 10 seconds during setup
  })
}

/**
 * Timer/schedule configuration (timers in /json/cfg)
 */
export function useWledTimers(baseUrl: string) {
  return useWledConfigSection(baseUrl, selectTimers)
}

/**
 * Reboot the WLED device
 */
export function useRebootDevice(baseUrl: string) {
  return useWledApiMutation(baseUrl, (api) => api.reboot())
}

/**
 * NTP time synchronization configuration (if.ntp in /json/cfg)
 */
export function useNtpConfig(baseUrl: string) {
  return useWledConfigSection(baseUrl, selectNtp)
}

// ============================================================================
// Configuration Mutation Hooks
// ============================================================================

/**
 * Get full device configuration with complete typing
 */
export function useWledFullConfig(baseUrl: string) {
  return useWledConfigSection(baseUrl, (config) => config)
}

/** Select part of /json/cfg; all sections share one cached request. */
function useWledConfigSection<T>(baseUrl: string, select: (config: WledFullConfig) => T) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.config,
    queryFn: () => api.getFullConfig(),
    staleTime: 60000,
    select,
  })
}

const selectLedHardware = (config: WledFullConfig) => config.hw.led
const selectTimers = (config: WledFullConfig) => config.timers
const selectNtp = (config: WledFullConfig) => config.if.ntp

/** LED hardware configuration (hw.led in /json/cfg) */
export function useLedHardwareConfig(baseUrl: string) {
  return useWledConfigSection(baseUrl, selectLedHardware)
}

/**
 * Save part of /json/cfg in one POST (WLED deep-merges it). Settings screens build one patch
 * from all their edited sections; see useSettingsForm.
 */
export function useSetConfig(baseUrl: string) {
  return useWledApiMutation(baseUrl, (api, patch: ConfigPatch) => api.setConfig(patch), configKeys)
}

/**
 * Factory reset the device
 */
export function useFactoryReset(baseUrl: string) {
  return useWledApiMutation(baseUrl, (api) => api.factoryReset())
}

/**
 * Upload firmware update
 */
export function useFirmwareUpload(baseUrl: string) {
  return useWledApiMutation(
    baseUrl,
    (api, { file, onProgress }: { file: File; onProgress?: (percent: number) => void }) =>
      api.uploadFirmware(file, onProgress),
  )
}

// ============================================================================
// Playlist Hooks
// ============================================================================

/**
 * Save a playlist configuration
 */
export function useSavePlaylist(baseUrl: string) {
  return useWledApiMutation(
    baseUrl,
    (api, { id, name, playlist }: { id: number; name: string; playlist: WledPlaylist }) =>
      api.savePlaylist(id, name, playlist),
    (keys) => [keys.presets],
  )
}
