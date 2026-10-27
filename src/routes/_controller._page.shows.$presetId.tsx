import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ErrorState } from '@/components/common/ErrorState'
import { LightShowEditorScreen } from '@/components/shows/LightShowEditorScreen'

export const Route = createFileRoute('/_controller/_page/shows/$presetId')({
  component: PresetEditorRoute,
})

function PresetEditorRoute() {
  const navigate = useNavigate()
  const { presetId } = Route.useParams()

  // Validate preset ID (WLED supports presets 1-250)
  const numericPresetId = Number(presetId)
  if (Number.isNaN(numericPresetId) || numericPresetId < 1 || numericPresetId > 250) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <ErrorState
          title="Invalid Preset ID"
          message={`Preset ID must be a number between 1 and 250. Received: ${presetId}`}
          onRetry={() => navigate({ to: '/shows' })}
        />
      </div>
    )
  }

  return (
    <LightShowEditorScreen
      mode="preset"
      presetId={numericPresetId}
      onClose={() => navigate({ to: '/shows' })}
    />
  )
}
