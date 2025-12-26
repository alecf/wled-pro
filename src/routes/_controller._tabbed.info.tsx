import { createFileRoute } from '@tanstack/react-router'
import { DeviceInfoScreen } from '@/components/info'

export const Route = createFileRoute('/_controller/_tabbed/info')({
  component: InfoComponent,
})

function InfoComponent() {
  const { info } = Route.useRouteContext()
  return <DeviceInfoScreen info={info} />
}
