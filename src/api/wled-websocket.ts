import type { WledState, WledInfo, WledStateUpdate } from '@/types/wled'

export interface WledWebSocketState {
  state: WledState
  info: WledInfo
}

export type WledWebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface WledWebSocketCallbacks {
  onStateChange?: (data: WledWebSocketState) => void
  onStatusChange?: (status: WledWebSocketStatus) => void
  onError?: (error: Error) => void
}

export class WledWebSocket {
  private ws: WebSocket | null = null
  private baseUrl: string
  private callbacks: WledWebSocketCallbacks
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private status: WledWebSocketStatus = 'disconnected'

  constructor(baseUrl: string, callbacks: WledWebSocketCallbacks = {}) {
    this.baseUrl = baseUrl
    this.callbacks = callbacks
  }

  private getWsUrl(): string {
    // Determine secure WebSocket protocol based on page load protocol
    const isPageSecure = window.location.protocol === 'https:'
    const protocol = isPageSecure ? 'wss' : 'ws'

    // Remove protocol from baseUrl to rebuild it
    const urlWithoutProtocol = this.baseUrl.replace(/^https?:\/\//, '')
    return `${protocol}://${urlWithoutProtocol}/ws`
  }

  private setStatus(status: WledWebSocketStatus): void {
    this.status = status
    this.callbacks.onStatusChange?.(status)
  }

  connect(): void {
    // Don't create a new connection if one is already open or connecting
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    this.setStatus('connecting')

    try {
      this.ws = new WebSocket(this.getWsUrl())

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.setStatus('connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WledWebSocketState
          if (data.state && data.info) {
            this.callbacks.onStateChange?.(data)
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      this.ws.onclose = () => {
        this.setStatus('disconnected')
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        this.setStatus('error')
        this.callbacks.onError?.(new Error('WebSocket connection error'))
      }
    } catch (err) {
      this.setStatus('error')
      this.callbacks.onError?.(err instanceof Error ? err : new Error(String(err)))
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnect

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.setStatus('disconnected')
  }

  send(update: WledStateUpdate): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(update))
    }
  }

  requestFullState(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ v: true }))
    }
  }

  getStatus(): WledWebSocketStatus {
    return this.status
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
