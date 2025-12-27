import { Sparkles, Wand2, Palette, Info, Menu, Split, type LucideIcon } from 'lucide-react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export type TabId = 'shows' | 'effects' | 'palettes' | 'segments' | 'info' | 'more'

interface TabConfig {
  id: TabId
  label: string
  icon: LucideIcon
  path?: string // Route path (undefined for 'more')
}

const tabs: TabConfig[] = [
  { id: 'shows', label: 'Shows', icon: Sparkles, path: '/shows' },
  { id: 'effects', label: 'Effects', icon: Wand2, path: '/effects' },
  { id: 'palettes', label: 'Palettes', icon: Palette, path: '/palettes' },
  { id: 'segments', label: 'Segments', icon: Split, path: '/segments' },
  { id: 'info', label: 'Info', icon: Info, path: '/info' },
  { id: 'more', label: 'More', icon: Menu }, // No path - opens sheet
]

interface TabBarProps {
  onMoreClick: () => void
}

export function TabBar({ onMoreClick }: TabBarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  // Determine active tab from URL
  const currentPath = location.pathname
  const activeTabId = tabs.find(t => t.path && currentPath.startsWith(t.path))?.id || 'shows'
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
      <div className="flex items-center justify-around h-14 pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTabId === tab.id

          const handleClick = () => {
            if (tab.id === 'more') {
              onMoreClick()
            } else if (tab.path) {
              navigate({ to: tab.path })
            }
          }

          return (
            <button
              key={tab.id}
              onClick={handleClick}
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
