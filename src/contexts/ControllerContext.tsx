import { createContext, useContext } from 'react'
import type { WledState, WledInfo } from '@/types/wled'
import type { WledWebSocketStatus } from '@/api/wled-websocket'
import type { Controller } from '@/types/controller'

interface ControllerContextValue {
  controller: Controller
  state: WledState | null
  info: WledInfo | null
  status: WledWebSocketStatus
  isConnected: boolean
  /** Whether using HTTP polling instead of WebSocket (due to mixed content) */
  isPolling: boolean
  onOpenControllerPicker: () => void
}

export const ControllerContext = createContext<ControllerContextValue | null>(null)

export function useControllerContext() {
  const context = useContext(ControllerContext)
  if (!context) {
    throw new Error('useControllerContext must be used within ControllerContext.Provider')
  }
  return context
}
