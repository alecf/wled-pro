import { ScreenContainer } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WledInfo } from '@/types/wled'

interface DeviceInfoScreenProps {
  info: WledInfo | null
}

export function DeviceInfoScreen({ info }: DeviceInfoScreenProps) {
  if (!info) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading device info...</p>
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Device</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd className="text-right font-medium">{info.name}</dd>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="text-right">{info.ver}</dd>
            <dt className="text-muted-foreground">Build ID</dt>
            <dd className="text-right font-mono text-xs">{info.vid}</dd>
            <dt className="text-muted-foreground">Platform</dt>
            <dd className="text-right">{info.arch}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">LEDs</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Total Count</dt>
            <dd className="text-right font-medium">{info.leds.count}</dd>
            <dt className="text-muted-foreground">Max Power</dt>
            <dd className="text-right">{info.leds.pwr} mA</dd>
            <dt className="text-muted-foreground">Max Segments</dt>
            <dd className="text-right">{info.leds.maxseg}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Network</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">IP Address</dt>
            <dd className="text-right font-mono">{info.ip}</dd>
            <dt className="text-muted-foreground">MAC Address</dt>
            <dd className="text-right font-mono text-xs">{info.mac}</dd>
            <dt className="text-muted-foreground">WiFi Signal</dt>
            <dd className="text-right">{info.wifi.signal}%</dd>
            <dt className="text-muted-foreground">WiFi Channel</dt>
            <dd className="text-right">{info.wifi.channel}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Uptime</dt>
            <dd className="text-right">
              {Math.floor(info.uptime / 3600)}h {Math.floor((info.uptime % 3600) / 60)}m
            </dd>
            <dt className="text-muted-foreground">Free Heap</dt>
            <dd className="text-right">{(info.freeheap / 1024).toFixed(1)} KB</dd>
            <dt className="text-muted-foreground">Filesystem</dt>
            <dd className="text-right">
              {info.fs ? `${((info.fs.u / info.fs.t) * 100).toFixed(0)}% used` : 'N/A'}
            </dd>
          </dl>
        </CardContent>
      </Card>
    </ScreenContainer>
  )
}
