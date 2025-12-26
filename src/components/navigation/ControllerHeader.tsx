import { Wifi, WifiOff } from 'lucide-react'
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets'

interface ControllerHeaderProps {
  name: string
  version?: string
  isConnected: boolean
  isReconnecting?: boolean
}

export function ControllerHeader({
  name,
  version,
  isConnected,
  isReconnecting,
}: ControllerHeaderProps) {
  const insets = useSafeAreaInsets()

  return (
    <header
      className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
      style={{ paddingTop: insets.top }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{name}</h1>
          {version && (
            <p className="text-xs text-muted-foreground">v{version}</p>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
          style={{
            color: isConnected
              ? 'var(--color-status-live)'
              : isReconnecting
                ? 'var(--color-status-reconnecting)'
                : 'var(--color-status-offline)',
            backgroundColor: `color-mix(in okl ch, ${
              isConnected
                ? 'var(--color-status-live)'
                : isReconnecting
                  ? 'var(--color-status-reconnecting)'
                  : 'var(--color-status-offline)'
            } 10%, transparent)`,
          }}
        >
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Live</span>
            </>
          ) : isReconnecting ? (
            <>
              <WifiOff className="h-3 w-3 animate-pulse" />
              <span>Reconnecting</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
