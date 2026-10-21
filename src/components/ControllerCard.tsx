import { Power, Trash2, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useWledStateInfo } from '@/hooks/useWled'
import type { Controller } from '@/types/controller'

interface ControllerCardProps {
  controller: Controller
  onClick: () => void
  onRemove: () => void
}

export function ControllerCard({ controller, onClick, onRemove }: ControllerCardProps) {
  // Polled over HTTP: the home screen must not use up WLED's few WebSocket slots
  const { data, isLoading, error } = useWledStateInfo(controller.url, {
    refetchInterval: 10000,
    retry: 1,
  })

  const isOnline = !error && data
  const info = data?.info
  const state = data?.state

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group relative"
      onClick={onClick}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          {isLoading ? (
            <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
          ) : isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          {info?.name || controller.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>{controller.url.replace(/^https?:\/\//, '')}</p>
          {info && (
            <p className="text-xs">
              {info.leds.count} LEDs • v{info.ver}
            </p>
          )}
          {state && (
            <div className="flex items-center gap-2">
              <Power
                className={`h-3 w-3 ${state.on ? 'text-green-500' : 'text-muted-foreground'}`}
              />
              <span className="text-xs">
                {state.on ? `On • ${Math.round((state.bri / 255) * 100)}%` : 'Off'}
              </span>
            </div>
          )}
          {error && <p className="text-xs text-destructive">Unable to connect</p>}
        </div>
      </CardContent>
    </Card>
  )
}
