import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LightShowEditorScreen } from '@/components/shows'
import { ControllerHeader } from '@/components/navigation'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/shows/$presetId')({
  component: PresetEditorComponent,
})

function PresetEditorComponent() {
  const navigate = useNavigate()
  const { presetId } = Route.useParams()
  const { controller, info, isConnected, status, state } = useControllerContext()

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
        mode="preset"
        presetId={Number(presetId)}
        onClose={() => navigate({ to: '/shows' })}
      />
    </div>
  )
}
