import { TabBar } from './TabBar'

interface AppShellProps {
  children: React.ReactNode
  onMoreClick: () => void
}

export function AppShell({ children, onMoreClick }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 overflow-auto pb-safe-14">
        {children}
      </main>
      <TabBar onMoreClick={onMoreClick} />
    </div>
  )
}
