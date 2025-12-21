import { ScreenContainer } from '@/components/layout'
import { ListSection } from '@/components/common'
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
    <ScreenContainer className="p-4 space-y-6">
      <ListSection title="Device">
        <InfoRow label="Name" value={info.name} />
        <InfoRow label="Version" value={info.ver} />
        <InfoRow label="Build ID" value={info.vid.toString()} mono />
        <InfoRow label="Platform" value={info.arch} />
      </ListSection>

      <ListSection title="LEDs">
        <InfoRow label="Total Count" value={info.leds.count.toString()} />
        <InfoRow label="Max Power" value={`${info.leds.pwr} mA`} />
        <InfoRow label="Max Segments" value={info.leds.maxseg.toString()} />
      </ListSection>

      <ListSection title="Network">
        <InfoRow label="IP Address" value={info.ip} mono />
        <InfoRow label="MAC Address" value={info.mac} mono />
        <InfoRow label="WiFi Signal" value={`${info.wifi.signal}%`} />
        <InfoRow label="WiFi Channel" value={info.wifi.channel.toString()} />
      </ListSection>

      <ListSection title="System">
        <InfoRow
          label="Uptime"
          value={`${Math.floor(info.uptime / 3600)}h ${Math.floor((info.uptime % 3600) / 60)}m`}
        />
        <InfoRow label="Free Heap" value={`${(info.freeheap / 1024).toFixed(1)} KB`} />
        <InfoRow
          label="Filesystem"
          value={info.fs ? `${((info.fs.u / info.fs.t) * 100).toFixed(0)}% used` : 'N/A'}
        />
      </ListSection>
    </ScreenContainer>
  )
}

interface InfoRowProps {
  label: string
  value: string
  mono?: boolean
}

function InfoRow({ label, value, mono }: InfoRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-list-divider)] last:border-b-0 bg-[var(--color-list-item-bg)] min-h-[48px]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={mono ? 'text-sm font-mono' : 'text-sm font-medium'}>{value}</dd>
    </div>
  )
}
