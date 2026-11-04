import { type LiveFrame, parseLiveBinary, parseLiveJson } from '@/lib/liveLeds'
import type { WledStateInfo, WledStateUpdate } from '@/types/wled'

/** Frames arrived this recently, so this client still holds WLED's live stream */
const LIVE_HELD_MS = 2000

export type WledWebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WledWebSocketCallbacks {
  onStateChange?: (data: WledStateInfo) => void
  /** A live LED frame (only sent while `setLive(true)`) */
  onLiveFrame?: (frame: LiveFrame) => void
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
  private live = false
  /** When the last live frame arrived over this connection (0 = none since `lv:true`) */
  private lastLiveFrameAt = 0

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
      // Live LED frames are binary
      this.ws.binaryType = 'arraybuffer'

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.setStatus('connected')
        // WLED forgets the live client when its connection closes
        if (this.live) this.ws?.send(JSON.stringify({ lv: true }))
      }

      this.ws.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          const frame = parseLiveBinary(event.data as ArrayBuffer)
          if (frame) this.emitLiveFrame(frame)
          return
        }
        let data: unknown
        try {
          data = JSON.parse(event.data)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
          return
        }
        if (typeof data !== 'object' || data === null) return
        const message = data as Partial<WledStateInfo> & { leds?: unknown }
        if (message.state && message.info) {
          this.callbacks.onStateChange?.(message as WledStateInfo)
        } else if (message.leds) {
          const frame = parseLiveJson(message)
          if (frame) this.emitLiveFrame(frame)
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

  private emitLiveFrame(frame: LiveFrame): void {
    this.lastLiveFrameAt = Date.now()
    try {
      this.callbacks.onLiveFrame?.(frame)
    } catch (err) {
      console.error('Live frame listener failed:', err)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    const delay = this.reconnectDelay * 2 ** this.reconnectAttempts
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

  /**
   * Start or stop the live LED stream ("peek"). Kept across reconnects. WLED streams to one
   * client at a time: another client asking for it (like WLED's own UI) takes it over.
   * `{"lv"}` must be sent on its own: WLED ignores state changes in the same message.
   * `{"lv":false}` from any client stops the stream, so it's only sent while frames are still
   * arriving here (not after another client took the stream over).
   */
  setLive(on: boolean): void {
    if (this.live === on) return
    this.live = on
    if (this.ws?.readyState !== WebSocket.OPEN) return
    if (on) {
      this.lastLiveFrameAt = 0
      this.ws.send(JSON.stringify({ lv: true }))
    } else if (Date.now() - this.lastLiveFrameAt < LIVE_HELD_MS) {
      this.ws.send(JSON.stringify({ lv: false }))
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
