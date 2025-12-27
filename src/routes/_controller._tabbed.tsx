import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell, ControllerHeader } from '@/components/navigation'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed')({
  component: TabbedLayout,
})

function TabbedLayout() {
  const { controller, state, info, isConnected, status, onOpenControllerPicker } = useControllerContext()

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
      />
      <Outlet />
    </AppShell>
  )
}
