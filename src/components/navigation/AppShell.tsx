import { TabBar } from './TabBar'
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets'

interface AppShellProps {
  children: React.ReactNode
  onMoreClick: () => void
}

export function AppShell({ children, onMoreClick }: AppShellProps) {
  const insets = useSafeAreaInsets()

  return (
    <div className="min-h-screen flex flex-col">
      <main
        className="flex-1 overflow-auto"
        style={{ paddingBottom: `calc(3.5rem + ${insets.bottom})` }}
      >
        {children}
      </main>
      <TabBar onMoreClick={onMoreClick} />
    </div>
  )
}
