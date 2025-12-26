import { createFileRoute } from '@tanstack/react-router'
import { SegmentsScreen } from '@/components/segments'

export const Route = createFileRoute('/_controller/_tabbed/segments')({
  component: SegmentsComponent,
})

function SegmentsComponent() {
  const { controller, info } = Route.useRouteContext()
  return <SegmentsScreen controllerId={controller.id} info={info} />
}
