import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  WledWebSocket,
  type WledWebSocketState,
  type WledWebSocketStatus,
} from '@/api/wled-websocket'
import type { WledState, WledStateUpdate } from '@/types/wled'
import { mergeWledState, mergeWledStateUpdate } from '@/lib/wled-state'
import { useWledStateInfo, useWledMutation } from './useWled'
import { getQueryKeys } from './useQueryKeys'

interface UseWledWebSocketOptions {
  enabled?: boolean
  debounceMs?: number
}

export function useWledWebSocket(baseUrl: string, options: UseWledWebSocketOptions = {}) {
  const { enabled = true, debounceMs = 50 } = options

  // Disable WebSocket when page is HTTPS and controller is HTTP
  // (browsers block insecure WebSocket from secure pages)
  const isPageSecure = window.location.protocol === 'https:'
  const isControllerInsecure = baseUrl.startsWith('http://') || !baseUrl.startsWith('https://')
  const wsEnabled = enabled && !(isPageSecure && isControllerInsecure)
  const queryClient = useQueryClient()
  const keys = getQueryKeys(baseUrl)
  const wsRef = useRef<WledWebSocket | null>(null)
  const [status, setStatus] = useState<WledWebSocketStatus>('disconnected')
  const [serverData, setServerData] = useState<WledWebSocketState | null>(null)
  const [optimisticUpdate, setOptimisticUpdate] = useState<WledStateUpdate | null>(null)

  // HTTP polling fallback when WebSocket is disabled
  const httpFallback = useWledStateInfo(baseUrl)
  const httpMutation = useWledMutation(baseUrl)
  const useHttpFallback = !wsEnabled

  // Debounce state for coalescing updates
  const pendingUpdateRef = useRef<WledStateUpdate>({})
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Merge server state with optimistic updates using deep merge
  const serverState = useHttpFallback
    ? httpFallback.data?.state ?? null
    : serverData?.state ?? null
  const state: WledState | null = useMemo(() => {
    if (!serverState) return null
    if (!optimisticUpdate) return serverState
    return mergeWledState(serverState, optimisticUpdate)
  }, [serverState, optimisticUpdate])

  const info = useHttpFallback
    ? httpFallback.data?.info ?? null
    : serverData?.info ?? null

  // Flush pending updates to the WebSocket or HTTP
  const flushUpdates = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const update = pendingUpdateRef.current
    if (Object.keys(update).length > 0) {
      if (useHttpFallback) {
        httpMutation.mutate(update)
      } else {
        wsRef.current?.send(update)
      }
      pendingUpdateRef.current = {}
    }
  }, [useHttpFallback, httpMutation])

  // Store latest flushUpdates in ref for stable access
  const flushUpdatesRef = useRef(flushUpdates)
  useEffect(() => {
    flushUpdatesRef.current = flushUpdates
  }, [flushUpdates])

  // Queue an update with debouncing and coalescing
  const queueUpdate = useCallback(
    (update: WledStateUpdate) => {
      // Deep merge with pending updates
      pendingUpdateRef.current = mergeWledStateUpdate(pendingUpdateRef.current, update)

      // Apply optimistic update immediately using deep merge
      setOptimisticUpdate((prev) => {
        if (!prev) return update
        return mergeWledStateUpdate(prev, update)
      })

      // Debounce the actual send
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(flushUpdates, debounceMs)
    },
    [flushUpdates, debounceMs]
  )

  useEffect(() => {
    console.log('[useWledWebSocket] Effect running:', { baseUrl, wsEnabled, queryClientRef: !!queryClient })

    if (!wsEnabled || !baseUrl) {
      console.log('[useWledWebSocket] Skipping - not enabled or no baseUrl')
      return
    }

    console.log('[useWledWebSocket] Creating new WebSocket connection')
    const ws = new WledWebSocket(baseUrl, {
      onStateChange: (newData) => {
        console.log('[useWledWebSocket] Received state update from WebSocket')
        setServerData(newData)
        // Clear optimistic state when server confirms
        setOptimisticUpdate(null)
        // Also update React Query cache so other components stay in sync
        queryClient.setQueryData(keys.fullState, {
          state: newData.state,
          info: newData.info,
          effects: [],
          palettes: [],
        })
      },
      onStatusChange: (newStatus) => {
        console.log('[useWledWebSocket] Status changed to:', newStatus)
        setStatus(newStatus)
      },
      onError: (error) => {
        console.error('WLED WebSocket error:', error)
      },
    })

    wsRef.current = ws
    ws.connect()

    return () => {
      console.log('[useWledWebSocket] Cleaning up WebSocket connection')
      // Flush any pending updates before disconnecting
      flushUpdatesRef.current()
      ws.disconnect()
      wsRef.current = null
    }
  }, [baseUrl, wsEnabled, queryClient])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const toggle = useCallback(() => {
    // For toggle, we need to know the current state to apply optimistic update
    const currentOn = state?.on ?? false
    queueUpdate({ on: !currentOn })
  }, [queueUpdate, state?.on])

  const setBrightness = useCallback(
    (bri: number) => {
      queueUpdate({ bri: Math.max(0, Math.min(255, bri)) })
    },
    [queueUpdate]
  )

  const setOn = useCallback(
    (on: boolean) => {
      queueUpdate({ on })
    },
    [queueUpdate]
  )

  // Determine effective status (HTTP fallback shows as connected when data is available)
  const effectiveStatus: WledWebSocketStatus = useHttpFallback
    ? httpFallback.isSuccess && httpFallback.data
      ? 'connected'
      : httpFallback.isError
        ? 'error'
        : 'connecting'
    : status

  return {
    status: effectiveStatus,
    isConnected: effectiveStatus === 'connected',
    state,
    info,
    // Expose both queue (debounced) and direct send for different use cases
    queueUpdate,
    flushUpdates,
    toggle,
    setBrightness,
    setOn,
  }
}
