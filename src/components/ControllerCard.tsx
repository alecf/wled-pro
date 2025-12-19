import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Wifi, WifiOff } from 'lucide-react'
import type { Controller } from '@/types/controller'
import type { WledInfo } from '@/types/wled'

interface ControllerCardProps {
  controller: Controller
  onClick: () => void
  onRemove: () => void
}

async function fetchControllerInfo(url: string): Promise<WledInfo> {
  const response = await fetch(`${url}/json/info`)
  if (!response.ok) throw new Error('Failed to connect')
  return response.json()
}

export function ControllerCard({ controller, onClick, onRemove }: ControllerCardProps) {
  const { data: info, isLoading, error } = useQuery({
    queryKey: ['controller-info', controller.id],
    queryFn: () => fetchControllerInfo(controller.url),
    retry: 1,
    staleTime: 30000,
  })

  const isOnline = !error && info

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
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{controller.url.replace(/^https?:\/\//, '')}</p>
          {info && (
            <p className="text-xs">
              {info.leds.count} LEDs • v{info.ver}
            </p>
          )}
          {error && <p className="text-xs text-destructive">Unable to connect</p>}
        </div>
      </CardContent>
    </Card>
  )
}
