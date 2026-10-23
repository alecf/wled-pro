import {
  Calendar,
  Check,
  Clock,
  Cpu,
  ListMusic,
  MonitorSmartphone,
  Radio,
  Shield,
  Timer,
  Wifi,
} from 'lucide-react'
import { ListSection } from '@/components/common/List'
import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'
import { ScrollHintContainer } from '@/components/common/ScrollHintContainer'
import { THEME_LABELS, type Theme, useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

/** Swatch colors for the theme picker (each theme's --background and --primary) */
const THEME_PREVIEW: Record<Theme, { background: string; primary: string }> = {
  light: { background: 'oklch(1 0 0)', primary: 'oklch(0.447 0.123 254.6)' },
  dark: { background: 'oklch(0.145 0 0)', primary: 'oklch(0.627 0.123 254.6)' },
  neon: { background: 'oklch(0.08 0 0)', primary: 'oklch(0.75 0.25 330)' },
  cyberpunk: { background: 'oklch(0.1 0.02 280)', primary: 'oklch(0.7 0.25 180)' },
  sunset: { background: 'oklch(0.95 0.03 50)', primary: 'oklch(0.55 0.2 30)' },
  ocean: { background: 'oklch(0.92 0.02 220)', primary: 'oklch(0.45 0.15 220)' },
}

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
    <ScrollHintContainer className="p-4 space-y-6">
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

      <ListSection title="App Theme">
        <div className="grid grid-cols-3 gap-2 px-4 py-3">
          {themes.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-2 text-sm transition-colors',
                theme === t
                  ? 'border-primary bg-list-item-bg-active'
                  : 'border-list-divider hover:bg-list-item-bg-hover',
              )}
            >
              <span
                className="flex h-6 w-full items-center justify-center rounded-md border border-black/10"
                style={{ background: THEME_PREVIEW[t].background }}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: THEME_PREVIEW[t].primary }}
                />
              </span>
              <span className="flex items-center gap-1">
                {THEME_LABELS[t]}
                {theme === t && <Check className="h-3.5 w-3.5 text-primary" />}
              </span>
            </button>
          ))}
        </div>
      </ListSection>
    </ScrollHintContainer>
  )
}
