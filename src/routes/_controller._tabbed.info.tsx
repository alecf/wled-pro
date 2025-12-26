import { createFileRoute } from '@tanstack/react-router'
import { DeviceInfoScreen } from '@/components/info'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed/info')({
  component: InfoComponent,
})

function InfoComponent() {
  const { info } = useControllerContext()
  return <DeviceInfoScreen info={info} />
}
