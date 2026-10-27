import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/components/navigation/AppShell'
import { ControllerHeader } from '@/components/navigation/ControllerHeader'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed')({
  component: TabbedLayout,
})

function TabbedLayout() {
  const { onOpenControllerPicker } = useControllerContext()

  return (
    <AppShell onMoreClick={onOpenControllerPicker}>
      <ControllerHeader />
      <Outlet />
    </AppShell>
  )
}
