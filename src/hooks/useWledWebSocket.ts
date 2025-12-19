import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  WledWebSocket,
  type WledWebSocketState,
  type WledWebSocketStatus,
} from '@/api/wled-websocket'
import type { WledStateUpdate } from '@/types/wled'

interface UseWledWebSocketOptions {
  enabled?: boolean
}

export function useWledWebSocket(baseUrl: string, options: UseWledWebSocketOptions = {}) {
  const { enabled = true } = options
  const queryClient = useQueryClient()
  const wsRef = useRef<WledWebSocket | null>(null)
  const [status, setStatus] = useState<WledWebSocketStatus>('disconnected')
  const [data, setData] = useState<WledWebSocketState | null>(null)

  useEffect(() => {
    if (!enabled || !baseUrl) {
      return
    }

    const ws = new WledWebSocket(baseUrl, {
      onStateChange: (newData) => {
        setData(newData)
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
      ws.disconnect()
      wsRef.current = null
    }
  }, [baseUrl, enabled, queryClient])

  const send = useCallback((update: WledStateUpdate) => {
    wsRef.current?.send(update)
  }, [])

  const toggle = useCallback(() => {
    send({ on: 't' as unknown as boolean }) // WLED accepts 't' to toggle
  }, [send])

  const setBrightness = useCallback(
    (bri: number) => {
      send({ bri: Math.max(0, Math.min(255, bri)) })
    },
    [send]
  )

  const setOn = useCallback(
    (on: boolean) => {
      send({ on })
    },
    [send]
  )

  return {
    status,
    isConnected: status === 'connected',
    data,
    state: data?.state ?? null,
    info: data?.info ?? null,
    send,
    toggle,
    setBrightness,
    setOn,
  }
}
