import { TabBar, type TabId } from './TabBar'

interface AppShellProps {
  children: React.ReactNode
  currentTab: TabId
  onTabChange: (tab: TabId) => void
}

export function AppShell({ children, currentTab, onTabChange }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main
        className="flex-1 overflow-auto"
        style={{
          paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </main>
      <TabBar currentTab={currentTab} onTabChange={onTabChange} />
    </div>
  )
}
