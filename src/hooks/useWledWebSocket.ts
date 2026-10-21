import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { WledWebSocket, type WledWebSocketStatus } from '@/api/wled-websocket'
import { mergeWledState, mergeWledStateUpdate } from '@/lib/wled-state'
import type { WledState, WledStateInfo, WledStateUpdate } from '@/types/wled'
import { getQueryKeys } from './useQueryKeys'
import { useWledMutation, useWledStateInfo } from './useWled'

interface UseWledWebSocketOptions {
  enabled?: boolean
  debounceMs?: number
}

/**
 * Live connection to a controller. Open exactly one per controller (the
 * `_controller` layout does this); screens read it via `useControllerContext`.
 *
 * Server data lives in the `stateInfo` query: the WebSocket writes every
 * message into it, and HTTP polling fills it when the WebSocket can't be used
 * (HTTPS page + HTTP controller) or is currently down.
 */
export function useWledWebSocket(baseUrl: string, options: UseWledWebSocketOptions = {}) {
  const { enabled = true, debounceMs = 50 } = options

  // Browsers block insecure WebSockets from secure pages
  const isPageSecure = window.location.protocol === 'https:'
  const wsEnabled = enabled && !!baseUrl && !(isPageSecure && !baseUrl.startsWith('https://'))
  const queryClient = useQueryClient()
  const keys = useMemo(() => getQueryKeys(baseUrl), [baseUrl])
  const wsRef = useRef<WledWebSocket | null>(null)
  const [wsStatus, setWsStatus] = useState<WledWebSocketStatus>(
    wsEnabled ? 'connecting' : 'disconnected',
  )
  const [optimisticUpdate, setOptimisticUpdate] = useState<WledStateUpdate | null>(null)

  const isPolling = !wsEnabled
  // Poll over HTTP when the WebSocket can't be used, or while it is down
  const wsDown = wsStatus === 'disconnected' || wsStatus === 'error'
  const serverQuery = useWledStateInfo(baseUrl, {
    enabled: enabled && !!baseUrl && (isPolling || wsDown),
  })
  const httpMutation = useWledMutation(baseUrl)

  const pendingUpdateRef = useRef<WledStateUpdate>({})
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const serverState = serverQuery.data?.state ?? null
  const info = serverQuery.data?.info ?? null
  const state: WledState | null = useMemo(() => {
    if (!serverState) return null
    if (!optimisticUpdate) return serverState
    return mergeWledState(serverState, optimisticUpdate)
  }, [serverState, optimisticUpdate])

  const flushUpdates = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const update = pendingUpdateRef.current
    if (Object.keys(update).length === 0) return
    pendingUpdateRef.current = {}

    const ws = wsRef.current
    if (ws?.isConnected()) {
      ws.send(update)
    } else {
      // The mutation refetches stateInfo; drop the overlay once that lands
      httpMutation.mutate(update, {
        onSettled: () => {
          if (Object.keys(pendingUpdateRef.current).length === 0) setOptimisticUpdate(null)
        },
      })
    }
  }, [httpMutation])

  // Latest flushUpdates for the WebSocket cleanup, which must not re-run on change
  const flushUpdatesRef = useRef(flushUpdates)
  useEffect(() => {
    flushUpdatesRef.current = flushUpdates
  }, [flushUpdates])

  /** Debounced, coalescing state update with an immediate optimistic overlay. */
  const queueUpdate = useCallback(
    (update: WledStateUpdate) => {
      pendingUpdateRef.current = mergeWledStateUpdate(pendingUpdateRef.current, update)
      setOptimisticUpdate((prev) => (prev ? mergeWledStateUpdate(prev, update) : update))

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(flushUpdates, debounceMs)
    },
    [flushUpdates, debounceMs],
  )

  useEffect(() => {
    if (!wsEnabled) return

    const ws = new WledWebSocket(baseUrl, {
      onStateChange: (data) => {
        queryClient.setQueryData<WledStateInfo>(keys.stateInfo, data)
        // The server's message supersedes the optimistic overlay
        setOptimisticUpdate(null)
      },
      onStatusChange: setWsStatus,
      onError: (error) => {
        console.error('WLED WebSocket error:', error)
      },
    })

    wsRef.current = ws
    ws.connect()

    return () => {
      flushUpdatesRef.current()
      ws.disconnect()
      wsRef.current = null
    }
  }, [baseUrl, wsEnabled, queryClient, keys.stateInfo])

  // Pending updates and the overlay belong to one controller: on a switch (or
  // unmount), send what's pending to the old controller and drop its overlay
  // so it isn't merged into the next controller's state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the cleanup must run when baseUrl changes
  useEffect(() => {
    return () => {
      flushUpdatesRef.current()
      setOptimisticUpdate(null)
    }
  }, [baseUrl])

  /** Toggle power */
  const toggle = useCallback(() => {
    queueUpdate({ on: !(state?.on ?? false) })
  }, [queueUpdate, state?.on])

  const setBrightness = useCallback(
    (bri: number) => {
      queueUpdate({ bri: Math.max(0, Math.min(255, bri)) })
    },
    [queueUpdate],
  )

  const setOn = useCallback(
    (on: boolean) => {
      queueUpdate({ on })
    },
    [queueUpdate],
  )

  // In polling mode the status reflects the HTTP query
  const status: WledWebSocketStatus = isPolling
    ? serverQuery.data
      ? 'connected'
      : serverQuery.isError
        ? 'error'
        : 'connecting'
    : wsStatus

  const isConnected = status === 'connected'
  return useMemo(
    () => ({
      status,
      isConnected,
      isPolling,
      state,
      info,
      queueUpdate,
      flushUpdates,
      toggle,
      setBrightness,
      setOn,
    }),
    [
      status,
      isConnected,
      isPolling,
      state,
      info,
      queueUpdate,
      flushUpdates,
      toggle,
      setBrightness,
      setOn,
    ],
  )
}
