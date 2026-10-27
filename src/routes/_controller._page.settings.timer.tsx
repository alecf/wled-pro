import { createFileRoute } from '@tanstack/react-router'
import { TimerScreen } from '@/components/timer/TimerScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/timer')({
  component: TimerRoute,
})

function TimerRoute() {
  return <TimerScreen onBack={useGoBack()} />
}
