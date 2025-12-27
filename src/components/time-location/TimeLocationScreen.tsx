import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { ListSection, ListItem } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
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
  Clock,
  Globe,
  MapPin,
  Info,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import { useNtpConfig, useSetNtpConfig, useRebootDevice } from '@/hooks/useWled'
import { useWledInfo } from '@/hooks/useWled'
import { toast } from 'sonner'
import type { WledNtpConfig } from '@/types/wled'

interface TimeLocationScreenProps {
  baseUrl: string
  onBack: () => void
}

const TIMEZONE_OPTIONS = [
  { value: 0, label: 'GMT (UTC)' },
  { value: 1, label: 'GMT/BST (UK)' },
  { value: 2, label: 'CET/CEST (Central Europe)' },
  { value: 3, label: 'EET/EEST (Eastern Europe)' },
  { value: 4, label: 'US Eastern (EST/EDT)' },
  { value: 5, label: 'US Central (CST/CDT)' },
  { value: 6, label: 'US Mountain (MST/MDT)' },
  { value: 7, label: 'US Arizona' },
  { value: 8, label: 'US Pacific (PST/PDT)' },
  { value: 9, label: 'China (CST/AWST/PHST)' },
  { value: 10, label: 'Japan (JST/KST)' },
  { value: 11, label: 'Australia Eastern (AEST/AEDT)' },
  { value: 12, label: 'New Zealand (NZST/NZDT)' },
  { value: 13, label: 'North Korea' },
  { value: 14, label: 'India (IST)' },
  { value: 15, label: 'Saskatchewan' },
  { value: 16, label: 'Australia Northern (ACST)' },
  { value: 17, label: 'Australia Southern (ACST/ACDT)' },
  { value: 18, label: 'Hawaii (HST)' },
  { value: 19, label: 'Novosibirsk (NOVT)' },
  { value: 20, label: 'Anchorage (AKST/AKDT)' },
  { value: 21, label: 'Mexico Central (MX-CST)' },
  { value: 22, label: 'Pakistan (PKT)' },
  { value: 23, label: 'Brasília (BRT)' },
]

export function TimeLocationScreen({ baseUrl, onBack }: TimeLocationScreenProps) {
  const { data: ntpConfig, isLoading, refetch } = useNtpConfig(baseUrl)
  const { data: info } = useWledInfo(baseUrl)
  const setNtpConfig = useSetNtpConfig(baseUrl)
  const reboot = useRebootDevice(baseUrl)

  const [hasChanges, setHasChanges] = useState(false)
  // Store only user edits - derive display data from server or local edits
  const [localEdits, setLocalEdits] = useState<Partial<WledNtpConfig> | null>(null)

  // Use local edits if user has made changes, otherwise use server data
  const formData: Partial<WledNtpConfig> = localEdits ?? ntpConfig ?? {}

  const handleChange = (field: keyof WledNtpConfig, value: unknown) => {
    setLocalEdits((prev) => ({ ...(prev ?? ntpConfig ?? {}), [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await setNtpConfig.mutateAsync(formData)
      toast.success('Time & Location settings saved')
      // Refetch FIRST to get updated server state, THEN clear local edits
      await refetch()
      setLocalEdits(null)
      setHasChanges(false)
    } catch (error) {
      toast.error('Failed to save settings')
      console.error(error)
    }
  }

  const handleSaveAndReboot = async () => {
    if (
      confirm(
        'Save changes and reboot device? The device will be unavailable for about 10 seconds.'
      )
    ) {
      try {
        await setNtpConfig.mutateAsync(formData)
        await reboot.mutateAsync()
        toast.success('Device rebooting...')
        setLocalEdits(null) // Reset to use server data
        setHasChanges(false)
        setTimeout(() => {
          toast.info('Settings are now active')
        }, 12000)
      } catch (error) {
        toast.error('Failed to save and reboot')
        console.error(error)
      }
    }
  }

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleChange('lt', position.coords.latitude)
          handleChange('ln', position.coords.longitude)
          toast.success('Location updated from browser')
        },
        (error) => {
          toast.error(`Location error: ${error.message}`)
        }
      )
    } else {
      toast.error('Geolocation not supported in this browser')
    }
  }

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
        <h1 className="text-xl font-semibold flex-1">Time & Location</h1>
        {hasChanges && (
          <Button onClick={handleSave} size="sm">
            Save
          </Button>
        )}
      </div>

      {/* Reboot Recommendation */}
      {hasChanges && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-500">Reboot Recommended</p>
            <p className="text-sm text-muted-foreground mt-1">
              For schedule features to work correctly, reboot after saving changes.
            </p>
          </div>
          <Button
            onClick={handleSaveAndReboot}
            variant="outline"
            size="sm"
            className="border-yellow-500/20"
            disabled={reboot.isPending}
          >
            {reboot.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Rebooting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Save & Reboot
              </>
            )}
          </Button>
        </div>
      )}

      {/* Current Time Display */}
      {info?.time && (
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Current Device Time</div>
              <div className="text-lg font-mono">{info.time}</div>
            </div>
          </div>
        </div>
      )}

      {/* Time Synchronization */}
      <ListSection title="Time Synchronization">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">NTP Enabled</div>
              <div className="text-sm text-muted-foreground">
                Sync time from internet server
              </div>
            </div>
            <Switch
              checked={formData.en ?? false}
              onCheckedChange={(checked) => handleChange('en', checked)}
            />
          </div>
        </ListItem>

        {formData.en && (
          <>
            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="ntp-host">NTP Server</Label>
                <input
                  id="ntp-host"
                  type="text"
                  value={formData.host ?? ''}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="0.wled.pool.ntp.org"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.tz?.toString() ?? '0'}
                  onValueChange={(value) => handleChange('tz', parseInt(value))}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value.toString()}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="utc-offset">UTC Offset (seconds)</Label>
                <input
                  id="utc-offset"
                  type="number"
                  value={formData.offset ?? 0}
                  onChange={(e) => handleChange('offset', parseInt(e.target.value) || 0)}
                  min={-65500}
                  max={65500}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  Fine-tune timezone (max ±18 hours)
                </p>
              </div>
            </ListItem>

            <ListItem>
              <div className="flex items-center gap-3 min-h-[48px] w-full">
                <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">12-Hour Format</div>
                  <div className="text-sm text-muted-foreground">Use AM/PM instead of 24h</div>
                </div>
                <Switch
                  checked={formData.ampm ?? false}
                  onCheckedChange={(checked) => handleChange('ampm', checked)}
                />
              </div>
            </ListItem>
          </>
        )}
      </ListSection>

      {/* Location */}
      <ListSection title="Location">
        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="latitude">Latitude</Label>
            <input
              id="latitude"
              type="number"
              value={formData.lt ?? 0}
              onChange={(e) => handleChange('lt', parseFloat(e.target.value) || 0)}
              min={-90}
              max={90}
              step={0.01}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="longitude">Longitude</Label>
            <input
              id="longitude"
              type="number"
              value={formData.ln ?? 0}
              onChange={(e) => handleChange('ln', parseFloat(e.target.value) || 0)}
              min={-180}
              max={180}
              step={0.01}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Required for sunrise/sunset schedules
            </p>
          </div>
        </ListItem>

        <ListItem onClick={handleGetLocation}>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <MapPin className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="font-medium text-primary">Get Current Location</div>
              <div className="text-sm text-muted-foreground">Use browser geolocation</div>
            </div>
          </div>
        </ListItem>
      </ListSection>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About Time & Location</p>
          <p>
            NTP synchronization keeps your device's clock accurate for scheduled presets
            and time-based features. Location coordinates are used to calculate sunrise
            and sunset times for schedule triggers.
          </p>
        </div>
      </div>
    </ScreenContainer>
  )
}
