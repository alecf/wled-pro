import { Sparkles, Wand2, Palette, Info, Menu, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type TabId = 'shows' | 'effects' | 'palettes' | 'info' | 'more'

interface TabConfig {
  id: TabId
  label: string
  icon: LucideIcon
}

const tabs: TabConfig[] = [
  { id: 'shows', label: 'Shows', icon: Sparkles },
  { id: 'effects', label: 'Effects', icon: Wand2 },
  { id: 'palettes', label: 'Palettes', icon: Palette },
  { id: 'info', label: 'Info', icon: Info },
  { id: 'more', label: 'More', icon: Menu },
]

interface TabBarProps {
  currentTab: TabId
  onTabChange: (tab: TabId) => void
}

export function TabBar({ currentTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div
        className="flex items-center justify-around h-14"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 mb-0.5 transition-transform',
                  isActive && 'scale-110'
                )}
              />
              <span
                className={cn(
                  'text-[10px] font-medium truncate',
                  isActive && 'font-semibold'
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
