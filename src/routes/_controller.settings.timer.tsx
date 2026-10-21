import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ControllerHeader } from '@/components/navigation/ControllerHeader'
import { TimerScreen } from '@/components/timer/TimerScreen'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/settings/timer')({
  component: TimerComponent,
})

function TimerComponent() {
  const navigate = useNavigate()
  const { controller, info, isConnected, isPolling, status, state } = useControllerContext()

  return (
    <div className="min-h-screen flex flex-col">
      <ControllerHeader
        name={info?.name || controller.name}
        version={info?.ver}
        isConnected={isConnected}
        isReconnecting={status === 'disconnected' && !!state}
        isPolling={isPolling}
      />
      <TimerScreen baseUrl={controller.url} onBack={() => navigate({ to: '/shows' })} />
    </div>
  )
}
