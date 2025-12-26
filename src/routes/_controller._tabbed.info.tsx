import { createFileRoute } from '@tanstack/react-router'
import { DeviceInfoScreen } from '@/components/info'
import { useControllerContext } from '@/contexts/ControllerContext'
import { useWledInfo } from '@/hooks/useWled'

export const Route = createFileRoute('/_controller/_tabbed/info')({
  component: InfoComponent,
})

function InfoComponent() {
  const { controller } = useControllerContext()
  const { data: info, refetch, isFetching } = useWledInfo(controller.url)
  return <DeviceInfoScreen info={info ?? null} onRefresh={refetch} isRefreshing={isFetching} />
}
