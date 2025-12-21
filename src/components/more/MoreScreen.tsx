import { ScreenContainer } from '@/components/layout'
import { ListItem, ListSection } from '@/components/common'
import { MonitorSmartphone, Palette, ChevronRight, Check } from 'lucide-react'
import { useTheme, THEME_LABELS, type Theme } from '@/contexts/ThemeContext'

interface MoreScreenProps {
  onSwitchController: () => void
}

export function MoreScreen({ onSwitchController }: MoreScreenProps) {
  const { theme, setTheme } = useTheme()

  const themes: Theme[] = ['light', 'dark', 'neon', 'cyberpunk', 'sunset', 'ocean']

  return (
    <ScreenContainer className="p-4 space-y-6">
      <ListSection title="Device">
        <ListItem onClick={onSwitchController}>
          <div className="flex items-center gap-3 min-h-[48px]">
            <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium">Switch Controller</div>
              <div className="text-sm text-muted-foreground">
                Change to a different WLED device
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </ListItem>
      </ListSection>

      <ListSection title="Theme">
        {themes.map((t) => (
          <ListItem
            key={t}
            onClick={() => setTheme(t)}
            active={theme === t}
          >
            <div className="flex items-center gap-3 min-h-[48px]">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">{THEME_LABELS[t]}</div>
              </div>
              {theme === t && (
                <Check className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
              )}
            </div>
          </ListItem>
        ))}
      </ListSection>
    </ScreenContainer>
  )
}
