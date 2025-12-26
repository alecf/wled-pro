import { ScreenContainer } from '@/components/layout'
import { Lightbulb, Wifi, Clock, HardDrive, ChevronDown, ChevronUp, Zap, Gauge, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WledInfo } from '@/types/wled'
import { useState } from 'react'

interface DeviceInfoScreenProps {
  info: WledInfo | null
  onRefresh: () => void
  isRefreshing: boolean
}

export function DeviceInfoScreen({ info, onRefresh, isRefreshing }: DeviceInfoScreenProps) {
  const [showTechnical, setShowTechnical] = useState(false)

  if (!info) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading device info...</p>
        </div>
      </ScreenContainer>
    )
  }

  const uptimeHours = Math.floor(info.uptime / 3600)
  const uptimeMins = Math.floor((info.uptime % 3600) / 60)
  const fsUsagePercent = info.fs ? ((info.fs.u / info.fs.t) * 100).toFixed(0) : 0

  return (
    <ScreenContainer className="p-4 space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRefresh()}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Lightbulb}
          label="LEDs"
          value={info.leds.count.toString()}
          subtext={`${info.leds.fps} FPS`}
        />
        <StatCard
          icon={Wifi}
          label="WiFi"
          value={`${info.wifi.signal}%`}
          subtext={`${info.wifi.rssi} dBm`}
        />
        <StatCard
          icon={Clock}
          label="Uptime"
          value={uptimeHours > 0 ? `${uptimeHours}h` : `${uptimeMins}m`}
          subtext={uptimeHours > 0 ? `${uptimeMins}m` : ''}
        />
        <StatCard
          icon={HardDrive}
          label="Storage"
          value={`${fsUsagePercent}%`}
          subtext={`${(info.fs.u / 1024).toFixed(1)} / ${(info.fs.t / 1024).toFixed(1)} MB`}
        />
      </div>

      {/* Network Details */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">Network</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">IP Address</div>
            <div className="font-mono">{info.ip}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Channel</div>
            <div>Channel {info.wifi.channel}</div>
          </div>
          <div className="col-span-2">
            <div className="text-muted-foreground text-xs">BSSID</div>
            <div className="font-mono text-xs">{info.wifi.bssid}</div>
          </div>
          <div className="col-span-2">
            <div className="text-muted-foreground text-xs">MAC Address</div>
            <div className="font-mono text-xs">{info.mac}</div>
          </div>
        </div>
      </div>

      {/* Power & Performance */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Power Draw</span>
          </div>
          <div className="text-2xl font-bold">{info.leds.pwr}</div>
          <div className="text-xs text-muted-foreground">
            {info.leds.maxpwr > 0 ? `of ${info.leds.maxpwr} mA` : 'mA current'}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Performance</span>
          </div>
          <div className="text-2xl font-bold">{info.leds.fps}</div>
          <div className="text-xs text-muted-foreground">frames per second</div>
        </div>
      </div>

      {/* Technical Details (Collapsible) */}
      <button
        onClick={() => setShowTechnical(!showTechnical)}
        className="w-full bg-muted/30 rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">Technical Details</span>
        {showTechnical ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showTechnical && (
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <DetailRow label="Build ID" value={info.vid.toString()} mono />
          <DetailRow label="Platform" value={`${info.arch} (${info.core})`} />
          {(info.brand || info.product) && (
            <DetailRow label="Device" value={info.brand || info.product} />
          )}
          <DetailRow label="Free Heap" value={`${(info.freeheap / 1024).toFixed(1)} KB`} mono />
          <DetailRow label="Max Segments" value={info.leds.maxseg.toString()} />
          <DetailRow label="Effects" value={`${info.fxcount} effects, ${info.palcount} palettes`} />
        </div>
      )}
    </ScreenContainer>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: string
  subtext?: string
}

function StatCard({ icon: Icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string
  mono?: boolean
}

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? 'text-sm font-mono' : 'text-sm font-medium'}>{value}</dd>
    </div>
  )
}
