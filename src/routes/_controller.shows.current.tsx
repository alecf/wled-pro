import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LightShowEditorScreen } from '@/components/shows'
import { ControllerHeader } from '@/components/navigation'

export const Route = createFileRoute('/_controller/shows/current')({
  component: CurrentStateEditorComponent,
})

function CurrentStateEditorComponent() {
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
      <LightShowEditorScreen
        baseUrl={controller.url}
        controllerId={controller.id}
        mode="current"
        onClose={() => navigate({ to: '/shows' })}
      />
    </div>
  )
}
