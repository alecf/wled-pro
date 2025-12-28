import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LightShowEditorScreen } from '@/components/shows'
import { ControllerHeader } from '@/components/navigation'
import { useControllerContext } from '@/contexts/ControllerContext'
import { ErrorState } from '@/components/common/ErrorState'

export const Route = createFileRoute('/_controller/shows/$presetId')({
  component: PresetEditorComponent,
})

function PresetEditorComponent() {
  const navigate = useNavigate()
  const { presetId } = Route.useParams()
  const { controller, info, isConnected, isPolling, status, state } = useControllerContext()

  if (!controller) {
    return null
  }

  // Validate preset ID (WLED supports presets 1-250)
  const numericPresetId = Number(presetId)
  if (isNaN(numericPresetId) || numericPresetId < 1 || numericPresetId > 250) {
    return (
      <div className="min-h-screen flex flex-col">
        <ControllerHeader
          name={info?.name || controller.name}
          version={info?.ver}
          isConnected={isConnected}
          isReconnecting={status === 'disconnected' && !!state}
          isPolling={isPolling}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <ErrorState
            title="Invalid Preset ID"
            message={`Preset ID must be a number between 1 and 250. Received: ${presetId}`}
            onRetry={() => navigate({ to: '/shows' })}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ControllerHeader
        name={info?.name || controller.name}
        version={info?.ver}
        isConnected={isConnected}
        isReconnecting={status === 'disconnected' && !!state}
        isPolling={isPolling}
      />
      <LightShowEditorScreen
        baseUrl={controller.url}
        controllerId={controller.url}
        mode="preset"
        presetId={numericPresetId}
        onClose={() => navigate({ to: '/shows' })}
      />
    </div>
  )
}
