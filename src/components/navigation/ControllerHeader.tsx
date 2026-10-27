import { useIsMutating } from '@tanstack/react-query'
import { Loader2, Wifi, WifiOff } from 'lucide-react'
import { useControllerContext } from '@/contexts/ControllerContext'
import { cn } from '@/lib/utils'

/** The sticky header of every controller screen: name, firmware version and connection status */
export function ControllerHeader() {
  const { controller, info, state, status, isConnected, isPolling } = useControllerContext()
  const name = info?.name || controller.name
  const version = info?.ver
  // Data arrived before, so the connection dropped (rather than never connecting)
  const isReconnecting = status === 'disconnected' && !!state

  // Any mutation in progress (config, presets, segments file). State writes over the connection
  // (queueUpdate / send) aren't mutations, so they don't show it
  const isSaving = useIsMutating() > 0

  // Determine which icon to show based on save status
  const renderStatusIcon = () => {
    if (isSaving) {
      return <Loader2 className="h-3 w-3 animate-spin" />
    }
    // Default: wifi icon based on connection state
    if (isConnected) {
      return <Wifi className="h-3 w-3" />
    }
    return <WifiOff className="h-3 w-3" />
  }

  // Determine badge class
  const getBadgeClass = () => {
    if (isConnected) {
      return 'status-badge-live'
    }
    if (isReconnecting) {
      return 'status-badge-reconnecting'
    }
    return 'status-badge-offline'
  }

  // Determine status text
  const getStatusText = () => {
    if (!isConnected) {
      return isReconnecting ? 'Reconnecting' : 'Offline'
    }
    return 'Live'
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pt-safe">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{name}</h1>
          {version && <p className="text-xs text-muted-foreground">v{version}</p>}
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
            getBadgeClass(),
            isReconnecting && !isConnected && 'animate-pulse',
          )}
        >
          {renderStatusIcon()}
          <span>{getStatusText()}</span>
          {isPolling && isConnected && <span className="text-[10px] opacity-70">P</span>}
        </div>
      </div>
    </header>
  )
}
