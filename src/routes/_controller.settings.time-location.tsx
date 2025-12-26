import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TimeLocationScreen } from '@/components/time-location'
import { ControllerHeader } from '@/components/navigation'

export const Route = createFileRoute('/_controller/settings/time-location')({
  component: TimeLocationComponent,
})

function TimeLocationComponent() {
  const navigate = useNavigate()
  const { controller, info, isConnected, status, state } = Route.useRouteContext()

  if (!controller) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ControllerHeader
        name={info?.name || controller.name}
        version={info?.ver}
        isConnected={isConnected}
        isReconnecting={status === 'disconnected' && !!state}
      />
      <TimeLocationScreen
        baseUrl={controller.url}
        onBack={() => navigate({ to: '/shows' })}
      />
    </div>
  )
}
