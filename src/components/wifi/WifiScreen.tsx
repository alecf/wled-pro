import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { ListSection, ListItem } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { RebootPrompt } from '@/components/common/RebootPrompt'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wifi,
  WifiOff,
  Info,
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Radio,
  Globe,
} from 'lucide-react'
import {
  useWledFullConfig,
  useSetNetworkConfig,
  useSetApConfig,
  useWledNetworks,
  useWledInfo,
} from '@/hooks/useWled'
import { toast } from 'sonner'
import type { NetworkInstance, WledApConfig } from '@/types/wled'

interface WifiScreenProps {
  baseUrl: string
  onBack: () => void
}

const AP_BEHAVIOR_OPTIONS = [
  { value: 0, label: 'Always Off' },
  { value: 1, label: 'On if WiFi fails' },
  { value: 2, label: 'Always On' },
]

export function WifiScreen({ baseUrl, onBack }: WifiScreenProps) {
  const { data: config, isLoading, refetch: refetchConfig } = useWledFullConfig(baseUrl)
  const { data: info } = useWledInfo(baseUrl)
  const { data: networksData, refetch: refetchNetworks, isFetching: isScanningNetworks } = useWledNetworks(baseUrl)
  const setNetworkConfig = useSetNetworkConfig(baseUrl)
  const setApConfig = useSetApConfig(baseUrl)

  const [hasChanges, setHasChanges] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showApPassword, setShowApPassword] = useState(false)

  // Local state for network config
  const [networkEdits, setNetworkEdits] = useState<Partial<NetworkInstance & { psk?: string }> | null>(null)
  // Local state for AP config
  const [apEdits, setApEdits] = useState<Partial<WledApConfig & { psk?: string }> | null>(null)

  // Get current network instance (primary WiFi)
  const currentNetwork = config?.nw?.ins?.[0]
  const currentAp = config?.ap

  // Merge edits with current config
  const networkFormData: Partial<NetworkInstance & { psk?: string }> = {
    ...currentNetwork,
    ...networkEdits,
  }

  const apFormData: Partial<WledApConfig & { psk?: string }> = {
    ...currentAp,
    ...apEdits,
  }

  const handleNetworkChange = (field: keyof (NetworkInstance & { psk?: string }), value: unknown) => {
    setNetworkEdits((prev) => ({ ...(prev ?? {}), [field]: value }))
    setHasChanges(true)
  }

  const handleApChange = (field: keyof (WledApConfig & { psk?: string }), value: unknown) => {
    setApEdits((prev) => ({ ...(prev ?? {}), [field]: value }))
    setHasChanges(true)
  }

  const handleIpChange = (field: 'ip' | 'gw' | 'sn', index: number, value: string) => {
    const numValue = parseInt(value) || 0
    const clampedValue = Math.max(0, Math.min(255, numValue))
    const currentArray = networkFormData[field] || [0, 0, 0, 0]
    const newArray = [...currentArray] as [number, number, number, number]
    newArray[index] = clampedValue
    handleNetworkChange(field, newArray)
  }

  const handleApIpChange = (index: number, value: string) => {
    const numValue = parseInt(value) || 0
    const clampedValue = Math.max(0, Math.min(255, numValue))
    const currentArray = apFormData.ip || [4, 3, 2, 1]
    const newArray = [...currentArray] as [number, number, number, number]
    newArray[index] = clampedValue
    handleApChange('ip', newArray)
  }

  const handleSave = async () => {
    try {
      // Save network config if changed
      if (networkEdits) {
        await setNetworkConfig.mutateAsync({ ins: [networkFormData] })
      }
      // Save AP config if changed
      if (apEdits) {
        await setApConfig.mutateAsync(apFormData)
      }
      toast.success('WiFi settings saved. Reboot for changes to take effect.')
      // Refetch FIRST to get updated server state, THEN clear local edits
      await refetchConfig()
      setNetworkEdits(null)
      setApEdits(null)
      setHasChanges(false)
    } catch (error) {
      toast.error('Failed to save settings')
      console.error(error)
    }
  }

  const handleScanNetworks = () => {
    refetchNetworks()
    toast.info('Scanning for networks...')
  }

  const handleSelectNetwork = (ssid: string) => {
    handleNetworkChange('ssid', ssid)
    toast.info(`Selected: ${ssid}`)
  }

  const isStaticIpEnabled = networkFormData.ip && networkFormData.ip.some((v) => v !== 0)

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ScreenContainer className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="ghost" size="icon" className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold flex-1">WiFi Setup</h1>
        {hasChanges && (
          <Button onClick={handleSave} size="sm" disabled={setNetworkConfig.isPending || setApConfig.isPending}>
            Save
          </Button>
        )}
      </div>

      {/* Reboot Prompt */}
      <RebootPrompt
        baseUrl={baseUrl}
        hasChanges={hasChanges}
        onSaveBeforeReboot={handleSave}
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
                <div className="text-sm text-muted-foreground">
                  {config.id.mdns}.local
                </div>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Signal: {info.wifi?.signal}%</div>
              <div>Channel: {info.wifi?.channel}</div>
            </div>
          </div>
        </div>
      )}

      {/* Network Selection */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            WiFi Network
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleScanNetworks}
            disabled={isScanningNetworks}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isScanningNetworks ? 'animate-spin' : ''}`} />
            Scan
          </Button>
        </div>
        <div className="bg-[var(--color-list-bg)] -mx-4">
        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="ssid">Network Name (SSID)</Label>
            <input
              id="ssid"
              type="text"
              value={networkFormData.ssid ?? ''}
              onChange={(e) => handleNetworkChange('ssid', e.target.value)}
              placeholder="Enter WiFi name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </ListItem>

        {/* Available Networks */}
        {networksData?.networks && networksData.networks.length > 0 && (
          <ListItem>
            <div className="w-full space-y-2 py-2">
              <Label>Available Networks</Label>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {networksData.networks.map((network, idx) => (
                  <button
                    key={`${network.ssid}-${idx}`}
                    onClick={() => handleSelectNetwork(network.ssid)}
                    className={`flex items-center gap-3 p-2 rounded-md text-left hover:bg-muted/50 transition-colors ${
                      networkFormData.ssid === network.ssid ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                  >
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-sm">{network.ssid}</span>
                    <span className="text-xs text-muted-foreground">{network.rssi} dBm</span>
                  </button>
                ))}
              </div>
            </div>
          </ListItem>
        )}

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="wifi-password">Password</Label>
            <div className="relative">
              <input
                id="wifi-password"
                type={showPassword ? 'text' : 'password'}
                value={networkFormData.psk ?? ''}
                onChange={(e) => handleNetworkChange('psk', e.target.value)}
                placeholder={networkFormData.pskl ? `Current: ${networkFormData.pskl} characters` : 'Enter password'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </ListItem>
        </div>
      </div>

      {/* Static IP Configuration */}
      <ListSection title="Static IP (Optional)">
        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between">
              <Label>Use Static IP</Label>
              <Switch
                checked={isStaticIpEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    // Set a default static IP
                    handleNetworkChange('ip', [192, 168, 1, 100])
                    handleNetworkChange('gw', [192, 168, 1, 1])
                    handleNetworkChange('sn', [255, 255, 255, 0])
                  } else {
                    // Clear to DHCP
                    handleNetworkChange('ip', [0, 0, 0, 0])
                    handleNetworkChange('gw', [0, 0, 0, 0])
                  }
                }}
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
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      type="number"
                      min="0"
                      max="255"
                      value={networkFormData.ip?.[i] ?? 0}
                      onChange={(e) => handleIpChange('ip', i, e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ))}
                </div>
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label>Gateway</Label>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      type="number"
                      min="0"
                      max="255"
                      value={networkFormData.gw?.[i] ?? 0}
                      onChange={(e) => handleIpChange('gw', i, e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ))}
                </div>
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label>Subnet Mask</Label>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <input
                      key={i}
                      type="number"
                      min="0"
                      max="255"
                      value={networkFormData.sn?.[i] ?? 255}
                      onChange={(e) => handleIpChange('sn', i, e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  ))}
                </div>
              </div>
            </ListItem>
          </>
        )}
      </ListSection>

      {/* mDNS */}
      <ListSection title="Device Name">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">{config?.id?.mdns || 'wled'}.local</div>
              <div className="text-sm text-muted-foreground">
                mDNS hostname for local network access
              </div>
            </div>
          </div>
        </ListItem>
      </ListSection>

      {/* Access Point Configuration */}
      <ListSection title="Access Point">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Radio className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">AP Mode</div>
              <div className="text-sm text-muted-foreground">
                When to enable the WiFi access point
              </div>
            </div>
            <Select
              value={apFormData.behav?.toString() ?? '1'}
              onValueChange={(value) => handleApChange('behav', parseInt(value))}
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
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="ap-ssid">AP Name (SSID)</Label>
            <input
              id="ap-ssid"
              type="text"
              value={apFormData.ssid ?? 'WLED-AP'}
              onChange={(e) => handleApChange('ssid', e.target.value)}
              placeholder="WLED-AP"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="ap-password">AP Password</Label>
            <div className="relative">
              <input
                id="ap-password"
                type={showApPassword ? 'text' : 'password'}
                value={apFormData.psk ?? ''}
                onChange={(e) => handleApChange('psk', e.target.value)}
                placeholder={apFormData.pskl ? `Current: ${apFormData.pskl} characters` : 'Enter AP password'}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowApPassword(!showApPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showApPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Default: wled1234 (min 8 characters)
            </p>
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label>AP Channel</Label>
            <Select
              value={apFormData.chan?.toString() ?? '1'}
              onValueChange={(value) => handleApChange('chan', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((ch) => (
                  <SelectItem key={ch} value={ch.toString()}>
                    Channel {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ListItem>

        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <WifiOff className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Hide AP</div>
              <div className="text-sm text-muted-foreground">
                Don't broadcast the AP SSID
              </div>
            </div>
            <Switch
              checked={apFormData.hide === 1}
              onCheckedChange={(checked) => handleApChange('hide', checked ? 1 : 0)}
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label>AP IP Address</Label>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  type="number"
                  min="0"
                  max="255"
                  value={apFormData.ip?.[i] ?? [4, 3, 2, 1][i]}
                  onChange={(e) => handleApIpChange(i, e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Default: 4.3.2.1
            </p>
          </div>
        </ListItem>
      </ListSection>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About WiFi Settings</p>
          <p>
            WiFi changes require a device reboot. If you enter incorrect WiFi credentials,
            the device will create an access point (WLED-AP) that you can connect to for recovery.
            You can also hold the button for 12+ seconds to factory reset.
          </p>
        </div>
      </div>
    </ScreenContainer>
  )
}
