import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  WledWebSocket,
  type WledWebSocketState,
  type WledWebSocketStatus,
} from '@/api/wled-websocket'
import type { WledStateUpdate } from '@/types/wled'

interface UseWledWebSocketOptions {
  enabled?: boolean
  debounceMs?: number
}

export function useWledWebSocket(baseUrl: string, options: UseWledWebSocketOptions = {}) {
  const { enabled = true, debounceMs = 50 } = options
  const queryClient = useQueryClient()
  const wsRef = useRef<WledWebSocket | null>(null)
  const [status, setStatus] = useState<WledWebSocketStatus>('disconnected')
  const [serverData, setServerData] = useState<WledWebSocketState | null>(null)
  // Use WledStateUpdate type for optimistic state since that's what we're merging
  const [optimisticState, setOptimisticState] = useState<WledStateUpdate | null>(null)

  // Debounce state for coalescing updates
  const pendingUpdateRef = useRef<WledStateUpdate>({})
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Merge server state with optimistic updates
  const serverState = serverData?.state ?? null
  const state = useMemo(() => {
    if (!serverState) return null
    if (!optimisticState) return serverState
    return { ...serverState, ...optimisticState }
  }, [serverState, optimisticState])

  const info = serverData?.info ?? null

  // Flush pending updates to the WebSocket
  const flushUpdates = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const update = pendingUpdateRef.current
    if (Object.keys(update).length > 0) {
      wsRef.current?.send(update)
      pendingUpdateRef.current = {}
    }
  }, [])

  // Queue an update with debouncing and coalescing
  const queueUpdate = useCallback(
    (update: WledStateUpdate) => {
      // Merge with pending updates
      pendingUpdateRef.current = { ...pendingUpdateRef.current, ...update }

      // Apply optimistic update immediately
      setOptimisticState((prev) => ({
        ...prev,
        ...update,
      }))

      // Debounce the actual send
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(flushUpdates, debounceMs)
    },
    [flushUpdates, debounceMs]
  )

  useEffect(() => {
    if (!enabled || !baseUrl) {
      return
    }

    const ws = new WledWebSocket(baseUrl, {
      onStateChange: (newData) => {
        setServerData(newData)
        // Clear optimistic state when server confirms
        setOptimisticState(null)
        // Also update React Query cache so other components stay in sync
        queryClient.setQueryData(['wled', baseUrl, 'fullState'], {
          state: newData.state,
          info: newData.info,
          effects: [],
          palettes: [],
        })
      },
      onStatusChange: setStatus,
      onError: (error) => {
        console.error('WLED WebSocket error:', error)
      },
    })

    wsRef.current = ws
    ws.connect()

    return () => {
      // Flush any pending updates before disconnecting
      flushUpdates()
      ws.disconnect()
      wsRef.current = null
    }
  }, [baseUrl, enabled, queryClient, flushUpdates])

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

  return {
    status,
    isConnected: status === 'connected',
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
