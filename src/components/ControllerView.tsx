import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Power, Wifi, WifiOff } from 'lucide-react'
import type { Controller } from '@/types/controller'

interface ControllerViewProps {
  controller: Controller
  onBack: () => void
}

export function ControllerView({ controller, onBack }: ControllerViewProps) {
  const { state, info, status, isConnected, toggle, setBrightness } = useWledWebSocket(
    controller.url
  )

  if (status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Connecting to {controller.name}...</div>
      </div>
    )
  }

  if (status === 'error' || (status === 'disconnected' && !state)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-destructive">Connection Error</h2>
          <p className="text-muted-foreground">
            Could not connect to {controller.name}
          </p>
          <p className="text-sm text-muted-foreground">{controller.url}</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Controllers
        </Button>
      </div>
    )
  }

  if (!state || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{info.name || controller.name}</h1>
            <p className="text-sm text-muted-foreground">v{info.ver}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-yellow-500" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>
        </header>

        <div className="flex justify-center">
          <Button
            size="lg"
            variant={state.on ? 'default' : 'outline'}
            className={`w-32 h-32 rounded-full text-lg font-semibold transition-all ${
              state.on
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25'
                : ''
            }`}
            onClick={toggle}
          >
            <Power className="h-8 w-8" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brightness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Slider
                value={[state.bri]}
                max={255}
                step={1}
                disabled={!state.on}
                onValueChange={([value]) => setBrightness(value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {Math.round((state.bri / 255) * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Device Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">LEDs</dt>
              <dd className="text-right">{info.leds.count}</dd>
              <dt className="text-muted-foreground">IP Address</dt>
              <dd className="text-right">{info.ip}</dd>
              <dt className="text-muted-foreground">Uptime</dt>
              <dd className="text-right">
                {Math.floor(info.uptime / 3600)}h {Math.floor((info.uptime % 3600) / 60)}m
              </dd>
              <dt className="text-muted-foreground">Free Memory</dt>
              <dd className="text-right">{(info.freeheap / 1024).toFixed(1)} KB</dd>
              <dt className="text-muted-foreground">WiFi Signal</dt>
              <dd className="text-right">{info.wifi.signal}%</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
