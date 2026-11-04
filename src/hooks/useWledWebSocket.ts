import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWledApi } from '@/api/wled'
import { WledWebSocket, type WledWebSocketStatus } from '@/api/wled-websocket'
import { mergeWledState, mergeWledStateUpdate } from '@/lib/wled-state'
import type { WledState, WledStateInfo, WledStateUpdate } from '@/types/wled'
import { getQueryKeys } from './useQueryKeys'
import { useWledStateInfo } from './useWled'

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

  const pendingUpdateRef = useRef<WledStateUpdate>({})
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const serverState = serverQuery.data?.state ?? null
  const info = serverQuery.data?.info ?? null
  const state: WledState | null = useMemo(() => {
    if (!serverState) return null
    if (!optimisticUpdate) return serverState
    return mergeWledState(serverState, optimisticUpdate)
  }, [serverState, optimisticUpdate])

  /**
   * Send what's pending now: over the WebSocket when it's up (resolves once sent), otherwise
   * over HTTP (resolves once the device accepted it, rejects if it didn't).
   */
  const sendPending = useCallback(async () => {
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
      return
    }
    try {
      await getWledApi(baseUrl).setState(update)
    } finally {
      // Refetch the device's state, then drop the overlay (once nothing newer is pending), so
      // the UI doesn't flash back to the old state while the refetch is in flight
      await queryClient.invalidateQueries({ queryKey: keys.stateInfo })
      if (Object.keys(pendingUpdateRef.current).length === 0) setOptimisticUpdate(null)
    }
  }, [baseUrl, queryClient, keys.stateInfo])

  /**
   * Send pending updates now instead of after the debounce. Never rejects; await it before a
   * separate HTTP write (like saving a preset) that must land after the pending changes.
   */
  const flushUpdates = useCallback(
    () => sendPending().catch((error) => console.error('Failed to update WLED state:', error)),
    [sendPending],
  )

  // Latest flushUpdates for the WebSocket cleanup, which must not re-run on change
  const flushUpdatesRef = useRef(flushUpdates)
  useEffect(() => {
    flushUpdatesRef.current = flushUpdates
  }, [flushUpdates])

  /** Merge an update into the pending one and show it optimistically */
  const stage = useCallback((update: WledStateUpdate) => {
    pendingUpdateRef.current = mergeWledStateUpdate(pendingUpdateRef.current, update)
    setOptimisticUpdate((prev) => (prev ? mergeWledStateUpdate(prev, update) : update))
  }, [])

  /** Debounced, coalescing state update with an immediate optimistic overlay. */
  const queueUpdate = useCallback(
    (update: WledStateUpdate) => {
      stage(update)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(flushUpdates, debounceMs)
    },
    [stage, flushUpdates, debounceMs],
  )

  /**
   * Send an update now, together with anything still queued, on the same channel as
   * queueUpdate (so it can't overtake an earlier queued change). For actions that report
   * success or failure, like starting a timer or loading a preset.
   */
  const send = useCallback(
    (update: WledStateUpdate) => {
      stage(update)
      return sendPending()
    },
    [stage, sendPending],
  )

  /**
   * Re-read state and info over HTTP. WebSocket messages only carry info when the state
   * changes, so screens that show changing info (uptime, the device clock) call this.
   */
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Counts WebSocket messages, so a slower HTTP read can't overwrite a newer message
  const wsMessageCountRef = useRef(0)
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    const messagesBefore = wsMessageCountRef.current
    try {
      const data = await getWledApi(baseUrl).getStateInfo()
      if (wsMessageCountRef.current === messagesBefore) {
        queryClient.setQueryData<WledStateInfo>(keys.stateInfo, data)
      }
    } catch (error) {
      console.error('Failed to refresh WLED state:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [baseUrl, queryClient, keys.stateInfo])

  useEffect(() => {
    if (!wsEnabled) return

    const ws = new WledWebSocket(baseUrl, {
      onStateChange: (data) => {
        wsMessageCountRef.current++
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
      send,
      flushUpdates,
      refresh,
      isRefreshing,
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
      send,
      flushUpdates,
      refresh,
      isRefreshing,
      toggle,
      setBrightness,
      setOn,
    ],
  )
}
