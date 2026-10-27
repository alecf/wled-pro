import { useQueryClient } from '@tanstack/react-query'
import { Globe, Radio, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { InfoBox } from '@/components/common/InfoBox'
import { IpAddressInput } from '@/components/common/IpAddressInput'
import { ListItem, ListSection } from '@/components/common/List'
import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'
import { PasswordInput } from '@/components/common/PasswordInput'
import { RebootPrompt } from '@/components/common/RebootPrompt'
import { SettingsPage } from '@/components/common/SettingsPage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useControllerContext } from '@/contexts/ControllerContext'
import { useConfigEdits } from '@/hooks/useConfigEdits'
import { getQueryKeys } from '@/hooks/useQueryKeys'
import { useSettingsForm } from '@/hooks/useSettingsForm'
import { useWledFullConfig, useWledNetworks } from '@/hooks/useWled'
import { cn } from '@/lib/utils'

interface WifiScreenProps {
  onBack: () => void
}

const AP_BEHAVIOR_OPTIONS = [
  { value: 0, label: 'Always Off' },
  { value: 1, label: 'On if WiFi fails' },
  { value: 2, label: 'Always On' },
]

const AP_CHANNELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

export function WifiScreen({ onBack }: WifiScreenProps) {
  const baseUrl = useControllerContext().controller.url
  const { data: config, isLoading } = useWledFullConfig(baseUrl)
  const { info } = useControllerContext()
  const queryClient = useQueryClient()
  const {
    data: networksData,
    refetch: refetchNetworks,
    isFetching: isScanningNetworks,
  } = useWledNetworks(baseUrl)

  // Primary WiFi network and access point config
  const network = useConfigEdits(config?.nw?.ins?.[0])
  const ap = useConfigEdits(config?.ap)
  const networkFormData = network.formData
  const apFormData = ap.formData
  const { isDirty, isSaving, save, handleSave } = useSettingsForm(baseUrl, {
    sections: { network, ap },
    toPatch: ({ network, ap }) => ({ nw: network && { ins: [network] }, ap }),
    successMessage: 'WiFi settings saved. Reboot for changes to take effect.',
    // The scan results (and which network shows as connected) may be out of date now
    onSaved: () => queryClient.invalidateQueries({ queryKey: getQueryKeys(baseUrl).networks }),
  })

  const handleScanNetworks = () => {
    refetchNetworks()
    toast.info('Scanning for networks...')
  }

  const handleSelectNetwork = (ssid: string) => {
    network.setField('ssid', ssid)
    toast.info(`Selected: ${ssid}`)
  }

  const isStaticIpEnabled = networkFormData.ip?.some((v) => v !== 0)

  const handleStaticIpToggle = (checked: boolean) => {
    if (checked) {
      // Set a default static IP
      network.setField('ip', [192, 168, 1, 100])
      network.setField('gw', [192, 168, 1, 1])
      network.setField('sn', [255, 255, 255, 0])
    } else {
      // Clear to DHCP
      network.setField('ip', [0, 0, 0, 0])
      network.setField('gw', [0, 0, 0, 0])
    }
  }

  return (
    <SettingsPage
      title="WiFi Setup"
      onBack={onBack}
      isLoading={isLoading}
      isDirty={isDirty}
      isSaving={isSaving}
      onSave={handleSave}
    >
      <RebootPrompt
        baseUrl={baseUrl}
        show={isDirty}
        onSaveBeforeReboot={save}
        message="WiFi changes require a device reboot to take effect."
      />

      {/* Current Connection Status */}
      {info && (
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <div className="text-sm font-medium">Connected</div>
              <div className="text-lg font-mono">{info.ip}</div>
              {config?.id?.mdns && (
                <div className="text-sm text-muted-foreground">{config.id.mdns}.local</div>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Signal: {info.wifi?.signal}%</div>
              <div>Channel: {info.wifi?.channel}</div>
            </div>
          </div>
        </div>
      )}

      <ListSection
        title="WiFi Network"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleScanNetworks}
            disabled={isScanningNetworks}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isScanningNetworks && 'animate-spin')} />
            Scan
          </Button>
        }
      >
        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="ssid">Network Name (SSID)</Label>
            <Input
              id="ssid"
              type="text"
              value={networkFormData.ssid ?? ''}
              onChange={(e) => network.setField('ssid', e.target.value)}
              placeholder="Enter WiFi name"
            />
          </div>
        </ListItem>

        {networksData?.networks && networksData.networks.length > 0 && (
          <ListItem>
            <div className="w-full space-y-2 py-2">
              <Label>Available Networks</Label>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {networksData.networks.map((scanned) => (
                  <button
                    type="button"
                    key={`${scanned.ssid}-${scanned.bssid}`}
                    onClick={() => handleSelectNetwork(scanned.ssid)}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-md text-left hover:bg-muted/50 transition-colors',
                      networkFormData.ssid === scanned.ssid &&
                        'bg-primary/10 border border-primary/20',
                    )}
                  >
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{scanned.ssid}</span>
                    <span className="text-xs text-muted-foreground">{scanned.rssi} dBm</span>
                  </button>
                ))}
              </div>
            </div>
          </ListItem>
        )}

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="wifi-password">Password</Label>
            <PasswordInput
              id="wifi-password"
              value={networkFormData.psk ?? ''}
              onChange={(value) => network.setField('psk', value)}
              currentLength={networkFormData.pskl}
            />
          </div>
        </ListItem>
      </ListSection>

      <ListSection title="Static IP (Optional)">
        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="static-ip">Use Static IP</Label>
              <Switch
                id="static-ip"
                checked={isStaticIpEnabled}
                onCheckedChange={handleStaticIpToggle}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave disabled to use DHCP (automatic IP assignment)
            </p>
          </div>
        </ListItem>

        {isStaticIpEnabled && (
          <>
            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label>IP Address</Label>
                <IpAddressInput
                  label="IP Address"
                  value={networkFormData.ip}
                  onChange={(ip) => network.setField('ip', ip)}
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label>Gateway</Label>
                <IpAddressInput
                  label="Gateway"
                  value={networkFormData.gw}
                  onChange={(gw) => network.setField('gw', gw)}
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label>Subnet Mask</Label>
                <IpAddressInput
                  label="Subnet Mask"
                  value={networkFormData.sn}
                  fallback={[255, 255, 255, 255]}
                  onChange={(sn) => network.setField('sn', sn)}
                />
              </div>
            </ListItem>
          </>
        )}
      </ListSection>

      <ListSection title="Device Name">
        <ListItemWithIcon
          icon={Globe}
          title={`${config?.id?.mdns || 'wled'}.local`}
          subtitle="mDNS hostname for local network access"
          rightElement={null}
        />
      </ListSection>

      <ListSection title="Access Point">
        <ListItemWithIcon
          icon={Radio}
          title="AP Mode"
          subtitle="When to enable the WiFi access point"
          rightElement={
            <Select
              value={apFormData.behav?.toString() ?? '1'}
              onValueChange={(value) => ap.setField('behav', parseInt(value, 10))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AP_BEHAVIOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="ap-ssid">AP Name (SSID)</Label>
            <Input
              id="ap-ssid"
              type="text"
              value={apFormData.ssid ?? 'WLED-AP'}
              onChange={(e) => ap.setField('ssid', e.target.value)}
              placeholder="WLED-AP"
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="ap-password">AP Password</Label>
            <PasswordInput
              id="ap-password"
              value={apFormData.psk ?? ''}
              onChange={(value) => ap.setField('psk', value)}
              currentLength={apFormData.pskl}
              placeholder="Enter AP password"
            />
            <p className="text-xs text-muted-foreground">Default: wled1234 (min 8 characters)</p>
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="ap-channel">AP Channel</Label>
            <Select
              value={apFormData.chan?.toString() ?? '1'}
              onValueChange={(value) => ap.setField('chan', parseInt(value, 10))}
            >
              <SelectTrigger id="ap-channel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AP_CHANNELS.map((ch) => (
                  <SelectItem key={ch} value={ch.toString()}>
                    Channel {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ListItem>

        <ListItemWithIcon
          icon={WifiOff}
          title="Hide AP"
          subtitle="Don't broadcast the AP SSID"
          rightElement={
            <Switch
              checked={apFormData.hide === 1}
              onCheckedChange={(checked) => ap.setField('hide', checked ? 1 : 0)}
            />
          }
        />

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label>AP IP Address</Label>
            <IpAddressInput
              label="AP IP Address"
              value={apFormData.ip}
              fallback={[4, 3, 2, 1]}
              onChange={(ip) => ap.setField('ip', ip)}
            />
            <p className="text-xs text-muted-foreground">Default: 4.3.2.1</p>
          </div>
        </ListItem>
      </ListSection>

      <InfoBox
        variant="muted"
        title="About WiFi Settings"
        description="WiFi changes require a device reboot. If you enter incorrect WiFi credentials, the device will create an access point (WLED-AP) that you can connect to for recovery. You can also hold the button for 12+ seconds to factory reset."
      />
    </SettingsPage>
  )
}
