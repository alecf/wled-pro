import { ScreenContainer } from '@/components/layout'
import { ListSection } from '@/components/common/List'
import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'
import { MonitorSmartphone, Palette, Check, Timer, Calendar, Clock, Cpu, Wifi, Radio, Shield, ListMusic } from 'lucide-react'
import { useTheme, THEME_LABELS, type Theme } from '@/contexts/ThemeContext'

interface MoreScreenProps {
  onSwitchController: () => void
  onNavigateToTimer: () => void
  onNavigateToSchedules: () => void
  onNavigateToTimeLocation: () => void
  onNavigateToLedHardware: () => void
  onNavigateToWifi: () => void
  onNavigateToSync: () => void
  onNavigateToSecurity: () => void
  onNavigateToPlaylist: () => void
}

export function MoreScreen({
  onSwitchController,
  onNavigateToTimer,
  onNavigateToSchedules,
  onNavigateToTimeLocation,
  onNavigateToLedHardware,
  onNavigateToWifi,
  onNavigateToSync,
  onNavigateToSecurity,
  onNavigateToPlaylist,
}: MoreScreenProps) {
  const { theme, setTheme } = useTheme()

  const themes: Theme[] = ['light', 'dark', 'neon', 'cyberpunk', 'sunset', 'ocean']

  return (
    <ScreenContainer className="p-4 space-y-6">
      <ListSection title="Device">
        <ListItemWithIcon
          icon={MonitorSmartphone}
          title="Switch Controller"
          subtitle="Change to a different WLED device"
          onClick={onSwitchController}
        />
      </ListSection>

      <ListSection title="Features">
        <ListItemWithIcon
          icon={Timer}
          title="Sleep Timer"
          subtitle="Automatically turn off lights after a delay"
          onClick={onNavigateToTimer}
        />

        <ListItemWithIcon
          icon={Calendar}
          title="Schedules"
          subtitle="Trigger presets at specific times"
          onClick={onNavigateToSchedules}
        />

        <ListItemWithIcon
          icon={ListMusic}
          title="Playlist"
          subtitle="Cycle through presets automatically"
          onClick={onNavigateToPlaylist}
        />
      </ListSection>

      <ListSection title="Settings">
        <ListItemWithIcon
          icon={Wifi}
          title="WiFi Setup"
          subtitle="Configure network and access point"
          onClick={onNavigateToWifi}
        />

        <ListItemWithIcon
          icon={Radio}
          title="Sync"
          subtitle="UDP sync, MQTT, and voice assistant"
          onClick={onNavigateToSync}
        />

        <ListItemWithIcon
          icon={Clock}
          title="Time & Location"
          subtitle="Configure NTP, timezone, and coordinates"
          onClick={onNavigateToTimeLocation}
        />

        <ListItemWithIcon
          icon={Cpu}
          title="LED Hardware"
          subtitle="Configure LED strips, power, and performance"
          onClick={onNavigateToLedHardware}
        />

        <ListItemWithIcon
          icon={Shield}
          title="Security"
          subtitle="OTA lock, firmware update, factory reset"
          onClick={onNavigateToSecurity}
        />
      </ListSection>

      <ListSection title="Theme">
        {themes.map((t) => (
          <ListItemWithIcon
            key={t}
            icon={Palette}
            title={THEME_LABELS[t]}
            onClick={() => setTheme(t)}
            active={theme === t}
            rightElement={
              theme === t ? (
                <Check className="h-5 w-5 text-primary" />
              ) : undefined
            }
          />
        ))}
      </ListSection>
    </ScreenContainer>
  )
}
