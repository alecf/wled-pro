import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell, ControllerHeader } from '@/components/navigation'

export const Route = createFileRoute('/_controller/_tabbed')({
  component: TabbedLayout,
})

function TabbedLayout() {
  const { controller, state, info, isConnected, status, onOpenControllerPicker } = Route.useRouteContext()

  return (
    <AppShell onMoreClick={onOpenControllerPicker}>
      <ControllerHeader
        name={info?.name || controller.name}
        version={info?.ver}
        isConnected={isConnected}
        isReconnecting={status === 'disconnected' && !!state}
      />
      <Outlet context={{ controller, state, info }} />
    </AppShell>
  )
}
