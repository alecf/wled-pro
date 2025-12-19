import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWledApi } from '@/api/wled'
import type { WledStateUpdate } from '@/types/wled'

const getQueryKeys = (baseUrl: string) => ({
  fullState: ['wled', baseUrl, 'fullState'] as const,
  state: ['wled', baseUrl, 'state'] as const,
  info: ['wled', baseUrl, 'info'] as const,
  effects: ['wled', baseUrl, 'effects'] as const,
  palettes: ['wled', baseUrl, 'palettes'] as const,
})

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
