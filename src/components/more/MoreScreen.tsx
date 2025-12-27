import { ScreenContainer } from '@/components/layout'
import { ListSection, ListItemWithIcon } from '@/components/common'
import { MonitorSmartphone, Palette, Check, Timer, Calendar, Clock, Cpu } from 'lucide-react'
import { useTheme, THEME_LABELS, type Theme } from '@/contexts/ThemeContext'

interface MoreScreenProps {
  onSwitchController: () => void
  onNavigateToTimer: () => void
  onNavigateToSchedules: () => void
  onNavigateToTimeLocation: () => void
  onNavigateToLedHardware: () => void
}

export function MoreScreen({ onSwitchController, onNavigateToTimer, onNavigateToSchedules, onNavigateToTimeLocation, onNavigateToLedHardware }: MoreScreenProps) {
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
                <Check className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              ) : undefined
            }
          />
        ))}
      </ListSection>
    </ScreenContainer>
  )
}
