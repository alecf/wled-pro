import { createFileRoute } from '@tanstack/react-router'
import { SegmentsScreen } from '@/components/segments'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed/segments')({
  component: SegmentsComponent,
})

function SegmentsComponent() {
  const { controller, info } = useControllerContext()

  if (!controller) {
    return null
  }

  return <SegmentsScreen controllerId={controller.id} info={info} />
}
