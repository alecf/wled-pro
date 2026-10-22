import { Clock, Globe, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { InfoBox } from '@/components/common/InfoBox'
import { ListItem, ListSection } from '@/components/common/List'
import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'
import { RebootPrompt } from '@/components/common/RebootPrompt'
import { SettingsPage } from '@/components/common/SettingsPage'
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
import { useConfigEdits } from '@/hooks/useConfigEdits'
import { useNtpConfig, useSetNtpConfig, useWledInfo } from '@/hooks/useWled'

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
  const ntp = useConfigEdits(ntpConfig)
  const formData = ntp.formData

  /** Saves and clears edits; throws on failure (so Save & Reboot doesn't reboot). */
  const save = async () => {
    await setNtpConfig.mutateAsync(formData)
    toast.success('Time & Location settings saved')
    // Refetch FIRST to get updated server state, THEN clear local edits
    await refetch()
    ntp.reset()
  }

  const handleSave = () =>
    save().catch((error) => {
      toast.error('Failed to save settings')
      console.error(error)
    })

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          ntp.setField('lt', position.coords.latitude)
          ntp.setField('ln', position.coords.longitude)
          toast.success('Location updated from browser')
        },
        (error) => {
          toast.error(`Location error: ${error.message}`)
        },
      )
    } else {
      toast.error('Geolocation not supported in this browser')
    }
  }

  return (
    <SettingsPage
      title="Time & Location"
      onBack={onBack}
      isLoading={isLoading}
      isDirty={ntp.isDirty}
      isSaving={setNtpConfig.isPending}
      onSave={handleSave}
    >
      <RebootPrompt
        baseUrl={baseUrl}
        show={ntp.isDirty}
        onSaveBeforeReboot={save}
        message="For schedule features to work correctly, reboot after saving changes."
        confirmMessage="Save changes and reboot device? The device will be unavailable for about 10 seconds."
      />

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

      <ListSection title="Time Synchronization">
        <ListItemWithIcon
          icon={Clock}
          title="NTP Enabled"
          subtitle="Sync time from internet server"
          rightElement={
            <Switch
              checked={formData.en ?? false}
              onCheckedChange={(checked) => ntp.setField('en', checked)}
            />
          }
        />

        {formData.en && (
          <>
            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="ntp-host">NTP Server</Label>
                <Input
                  id="ntp-host"
                  type="text"
                  value={formData.host ?? ''}
                  onChange={(e) => ntp.setField('host', e.target.value)}
                  placeholder="0.wled.pool.ntp.org"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={formData.tz?.toString() ?? '0'}
                  onValueChange={(value) => ntp.setField('tz', parseInt(value, 10))}
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
                <Input
                  id="utc-offset"
                  type="number"
                  value={formData.offset ?? 0}
                  onChange={(e) => ntp.setField('offset', parseInt(e.target.value, 10) || 0)}
                  min={-65500}
                  max={65500}
                />
                <p className="text-xs text-muted-foreground">Fine-tune timezone (max ±18 hours)</p>
              </div>
            </ListItem>

            <ListItemWithIcon
              icon={Globe}
              title="12-Hour Format"
              subtitle="Use AM/PM instead of 24h"
              rightElement={
                <Switch
                  checked={formData.ampm ?? false}
                  onCheckedChange={(checked) => ntp.setField('ampm', checked)}
                />
              }
            />
          </>
        )}
      </ListSection>

      <ListSection title="Location">
        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              value={formData.lt ?? 0}
              onChange={(e) => ntp.setField('lt', parseFloat(e.target.value) || 0)}
              min={-90}
              max={90}
              step={0.01}
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-2 py-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              value={formData.ln ?? 0}
              onChange={(e) => ntp.setField('ln', parseFloat(e.target.value) || 0)}
              min={-180}
              max={180}
              step={0.01}
            />
            <p className="text-xs text-muted-foreground">Required for sunrise/sunset schedules</p>
          </div>
        </ListItem>

        <ListItemWithIcon
          icon={MapPin}
          iconClassName="text-primary"
          title={<span className="text-primary">Get Current Location</span>}
          subtitle="Use browser geolocation"
          onClick={handleGetLocation}
          rightElement={null}
        />
      </ListSection>

      <InfoBox
        variant="muted"
        title="About Time & Location"
        description="NTP synchronization keeps your device's clock accurate for scheduled presets and time-based features. Location coordinates are used to calculate sunrise and sunset times for schedule triggers."
      />
    </SettingsPage>
  )
}
