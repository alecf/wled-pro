import { createContext, useContext } from 'react'
import type { useWledWebSocket } from '@/hooks/useWledWebSocket'
import type { Controller } from '@/types/controller'

/**
 * The controller's single live connection (see useWledWebSocket) plus the
 * selected controller. Provided by the `_controller` layout route.
 */
interface ControllerContextValue extends ReturnType<typeof useWledWebSocket> {
  controller: Controller
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
