import { Wifi, WifiOff, Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApiActivity } from '@/hooks/useApiActivity'

interface ControllerHeaderProps {
  name: string
  version?: string
  isConnected: boolean
  isReconnecting?: boolean
  isPolling?: boolean
}

export function ControllerHeader({
  name,
  version,
  isConnected,
  isReconnecting,
  isPolling = false,
}: ControllerHeaderProps) {
  const { saveStatus } = useApiActivity()

  // Determine which icon to show based on save status
  const renderStatusIcon = () => {
    if (saveStatus === 'saving') {
      return <Loader2 className="h-3 w-3 animate-spin" />
    }
    if (saveStatus === 'success') {
      return <Check className="h-3 w-3" />
    }
    if (saveStatus === 'error') {
      return <X className="h-3 w-3" />
    }
    // Default: wifi icon based on connection state
    if (isConnected) {
      return <Wifi className="h-3 w-3" />
    }
    return <WifiOff className="h-3 w-3" />
  }

  // Determine badge class
  const getBadgeClass = () => {
    if (saveStatus === 'error') {
      return 'status-badge-offline' // Red for error
    }
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
          {version && (
            <p className="text-xs text-muted-foreground">v{version}</p>
          )}
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
            getBadgeClass(),
            isReconnecting && !isConnected && 'animate-pulse'
          )}
        >
          {renderStatusIcon()}
          <span>{getStatusText()}</span>
          {isPolling && isConnected && (
            <span className="text-[10px] opacity-70">P</span>
          )}
        </div>
      </div>
    </header>
  )
}
