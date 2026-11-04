import { createFileRoute } from '@tanstack/react-router'
import { SchedulesScreen } from '@/components/schedules/SchedulesScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/schedules')({
  component: SchedulesRoute,
})

function SchedulesRoute() {
  return <SchedulesScreen onBack={useGoBack()} />
}
