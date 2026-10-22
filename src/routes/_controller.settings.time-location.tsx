import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ControllerHeader } from '@/components/navigation/ControllerHeader'
import { TimeLocationScreen } from '@/components/time-location/TimeLocationScreen'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/settings/time-location')({
  component: TimeLocationComponent,
})

function TimeLocationComponent() {
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
      <TimeLocationScreen baseUrl={controller.url} onBack={() => navigate({ to: '/shows' })} />
    </div>
  )
}
