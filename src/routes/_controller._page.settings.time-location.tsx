import { createFileRoute } from '@tanstack/react-router'
import { TimeLocationScreen } from '@/components/time-location/TimeLocationScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/time-location')({
  component: TimeLocationRoute,
})

function TimeLocationRoute() {
  return <TimeLocationScreen onBack={useGoBack()} />
}
