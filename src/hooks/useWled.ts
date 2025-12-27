import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWledApi } from '@/api/wled'
import type {
  WledStateUpdate,
  PaletteWithColors,
  WledOtaConfig,
  NetworkInstance,
  WledApConfig,
  WledSyncConfig,
  WledMqttConfig,
  WledAlexaConfig,
  WledIdentityConfig,
} from '@/types/wled'
import { getQueryKeys } from './useQueryKeys'

export function useWledFullState(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.fullState,
    queryFn: () => api.getFullState(),
    refetchInterval: 5000,
  })
}

export function useWledState(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.state,
    queryFn: () => api.getState(),
    refetchInterval: 1000,
  })
}

export function useWledInfo(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.info,
    queryFn: () => api.getInfo(),
    staleTime: 30000,
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

export function useWledPalettes(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.palettes,
    queryFn: () => api.getPalettes(),
    staleTime: Infinity,
  })
}

/**
 * Fetch combined state and info in a single request.
 * More efficient than calling useWledState and useWledInfo separately.
 */
export function useWledStateInfo(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.stateInfo,
    queryFn: () => api.getStateInfo(),
    refetchInterval: 5000,
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
      const [names, colorMap] = await Promise.all([
        api.getPalettes(),
        api.getAllPaletteColors(),
      ])

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
 * Fetch extended palette data with color definitions.
 * This data is static per firmware version, so it's cached indefinitely.
 */
export function useWledPaletteData(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.paletteData,
    queryFn: () => api.getPaletteData(),
    staleTime: Infinity,
  })
}

/**
 * Fetch discovered WLED nodes on the network.
 * Useful for multi-device setups and node discovery UI.
 */
export function useWledNodes(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.nodes,
    queryFn: () => api.getNodes(),
    staleTime: 30000, // Refresh every 30 seconds
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
 * Fetch full device configuration.
 * Contains hardware settings, network config, timers, etc.
 */
export function useWledConfig(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.config,
    queryFn: () => api.getConfig(),
    staleTime: 60000, // Config rarely changes, refresh every minute
  })
}

export function useWledMutation(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (update: WledStateUpdate) => api.setState(update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

export function useToggle(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: () => api.toggle(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

export function useBrightness(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (bri: number) => api.setBrightness(bri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

export function useSetEffect(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: ({ segmentId, effectId }: { segmentId: number; effectId: number }) =>
      api.setEffect(segmentId, effectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

export function useSetPalette(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: ({ segmentId, paletteId }: { segmentId: number; paletteId: number }) =>
      api.setPalette(segmentId, paletteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

export function useSetColor(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: ({
      segmentId,
      color,
    }: {
      segmentId: number
      color: [number, number, number]
    }) => api.setColor(segmentId, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

/**
 * Fetch timer/schedule configuration from device
 */
export function useWledTimers(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.timers,
    queryFn: () => api.getTimers(),
    staleTime: 60000, // Timers rarely change, refresh every minute
  })
}

/**
 * Update timer/schedule configuration
 * Note: Requires device reboot for changes to take effect
 */
export function useSetTimers(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (timers: Parameters<typeof api.setTimers>[0]) =>
      api.setTimers(timers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.timers })
      queryClient.invalidateQueries({ queryKey: keys.config })
    },
  })
}

/**
 * Reboot the WLED device
 */
export function useRebootDevice(baseUrl: string) {
  const api = getWledApi(baseUrl)

  return useMutation({
    mutationFn: () => api.reboot(),
  })
}

/**
 * Get NTP time synchronization configuration
 */
export function useNtpConfig(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: [...keys.config, 'ntp'],
    queryFn: () => api.getNtpConfig(),
    staleTime: 60000, // Config rarely changes
  })
}

/**
 * Update NTP configuration
 */
export function useSetNtpConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (ntp: Parameters<typeof api.setNtpConfig>[0]) =>
      api.setNtpConfig(ntp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...keys.config, 'ntp'] })
      queryClient.invalidateQueries({ queryKey: keys.config })
      queryClient.invalidateQueries({ queryKey: keys.info })
    },
  })
}

// ============================================================================
// Configuration Mutation Hooks
// ============================================================================

/**
 * Get full device configuration with complete typing
 */
export function useWledFullConfig(baseUrl: string) {
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)
  return useQuery({
    queryKey: keys.config,
    queryFn: () => api.getFullConfig(),
    staleTime: 60000,
  })
}

/**
 * Update OTA/security configuration
 */
export function useSetOtaConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (ota: Partial<WledOtaConfig> & { psk?: string }) =>
      api.setOtaConfig(ota),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.config })
    },
  })
}

/**
 * Update WiFi network configuration
 * @note Requires device reboot for changes to take effect
 */
export function useSetNetworkConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (nw: { ins: Partial<NetworkInstance>[] }) =>
      api.setNetworkConfig(nw),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.config })
      queryClient.invalidateQueries({ queryKey: keys.networks })
    },
  })
}

/**
 * Update Access Point configuration
 * @note Requires device reboot for changes to take effect
 */
export function useSetApConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (ap: Partial<WledApConfig> & { psk?: string }) =>
      api.setApConfig(ap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.config })
    },
  })
}

/**
 * Update sync configuration (UDP)
 */
export function useSetSyncConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (sync: Partial<WledSyncConfig>) =>
      api.setSyncConfig(sync),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.config })
    },
  })
}

/**
 * Update MQTT configuration
 */
export function useSetMqttConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (mqtt: Partial<WledMqttConfig> & { psk?: string }) =>
      api.setMqttConfig(mqtt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.config })
    },
  })
}

/**
 * Update Alexa configuration
 */
export function useSetAlexaConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (va: Partial<WledAlexaConfig>) =>
      api.setAlexaConfig(va),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.config })
    },
  })
}

/**
 * Update device identity (name, mDNS, Alexa invocation)
 * @note Requires device reboot for mDNS changes to take effect
 */
export function useSetIdentityConfig(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (id: Partial<WledIdentityConfig>) =>
      api.setIdentityConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.config })
      queryClient.invalidateQueries({ queryKey: keys.info })
    },
  })
}

/**
 * Factory reset the device
 */
export function useFactoryReset(baseUrl: string) {
  const api = getWledApi(baseUrl)

  return useMutation({
    mutationFn: () => api.factoryReset(),
  })
}

/**
 * Upload firmware update
 */
export function useFirmwareUpload(baseUrl: string) {
  const api = getWledApi(baseUrl)

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) =>
      api.uploadFirmware(file, onProgress),
  })
}

// ============================================================================
// Playlist Hooks
// ============================================================================

/**
 * Start a playlist
 */
export function useStartPlaylist(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (playlistId: number = 1) => api.startPlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

/**
 * Stop the current playlist
 */
export function useStopPlaylist(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: () => api.stopPlaylist(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.state })
      queryClient.invalidateQueries({ queryKey: keys.fullState })
    },
  })
}

/**
 * Save a playlist configuration
 */
export function useSavePlaylist(baseUrl: string) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  return useMutation({
    mutationFn: (playlist: Parameters<typeof api.savePlaylist>[0]) =>
      api.savePlaylist(playlist),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.presets })
      queryClient.invalidateQueries({ queryKey: keys.state })
    },
  })
}
