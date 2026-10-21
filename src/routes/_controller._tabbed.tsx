import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/components/navigation/AppShell'
import { ControllerHeader } from '@/components/navigation/ControllerHeader'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed')({
  component: TabbedLayout,
})

function TabbedLayout() {
  const { controller, state, info, isConnected, isPolling, status, onOpenControllerPicker } =
    useControllerContext()

  if (!controller) {
    return null
  }

  return (
    <AppShell onMoreClick={onOpenControllerPicker}>
      <ControllerHeader
        name={info?.name || controller.name}
        version={info?.ver}
        isConnected={isConnected}
        isReconnecting={status === 'disconnected' && !!state}
        isPolling={isPolling}
      />
      <Outlet />
    </AppShell>
  )
}
