import { Link, type LinkProps } from '@tanstack/react-router'
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

interface MoreLink {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  to: LinkProps['to']
}

const SECTIONS: { title: string; links: MoreLink[] }[] = [
  {
    title: 'Features',
    links: [
      {
        icon: Timer,
        title: 'Sleep Timer',
        subtitle: 'Automatically turn off lights after a delay',
        to: '/settings/timer',
      },
      {
        icon: Calendar,
        title: 'Schedules',
        subtitle: 'Trigger presets at specific times',
        to: '/settings/schedules',
      },
      {
        icon: ListMusic,
        title: 'Playlist',
        subtitle: 'Cycle through presets automatically',
        to: '/settings/playlist',
      },
    ],
  },
  {
    title: 'Settings',
    links: [
      {
        icon: Wifi,
        title: 'WiFi Setup',
        subtitle: 'Configure network and access point',
        to: '/settings/wifi',
      },
      {
        icon: Radio,
        title: 'Sync',
        subtitle: 'UDP sync, MQTT, and voice assistant',
        to: '/settings/sync',
      },
      {
        icon: Clock,
        title: 'Time & Location',
        subtitle: 'Configure NTP, timezone, and coordinates',
        to: '/settings/time-location',
      },
      {
        icon: Cpu,
        title: 'LED Hardware',
        subtitle: 'Configure LED strips, power, and performance',
        to: '/settings/led-hardware',
      },
      {
        icon: Shield,
        title: 'Security',
        subtitle: 'OTA lock, firmware update, factory reset',
        to: '/settings/security',
      },
    ],
  },
]

interface MoreScreenProps {
  onSwitchController: () => void
  /** Called when a link is followed (e.g. to close the drawer) */
  onNavigate: () => void
}

export function MoreScreen({ onSwitchController, onNavigate }: MoreScreenProps) {
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

      {SECTIONS.map((section) => (
        <ListSection key={section.title} title={section.title}>
          {section.links.map(({ to, ...item }) => (
            <Link key={item.title} to={to} onClick={onNavigate} className="block">
              <ListItemWithIcon {...item} className="cursor-pointer active:bg-list-item-bg-hover" />
            </Link>
          ))}
        </ListSection>
      ))}

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
