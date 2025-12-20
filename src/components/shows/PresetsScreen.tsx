import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles, Loader2 } from 'lucide-react'
import { usePresets, useLoadPreset, useDeletePreset } from '@/hooks/usePresets'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { PresetCard } from './PresetCard'
import { MasterControls } from './MasterControls'

interface PresetsScreenProps {
  baseUrl: string
  onEditPreset?: (presetId: number) => void
  onCreatePreset?: () => void
}

export function PresetsScreen({
  baseUrl,
  onEditPreset,
  onCreatePreset,
}: PresetsScreenProps) {
  const { presets, isLoading: presetsLoading, error, refetch } = usePresets(baseUrl)
  const { state, toggle, setBrightness } = useWledWebSocket(baseUrl)
  const loadPreset = useLoadPreset(baseUrl)
  const deletePreset = useDeletePreset(baseUrl)

  const [loadingPresetId, setLoadingPresetId] = useState<number | null>(null)

  const handleActivatePreset = async (presetId: number) => {
    setLoadingPresetId(presetId)
    try {
      await loadPreset.mutateAsync(presetId)
    } finally {
      setLoadingPresetId(null)
    }
  }

  const handleDeletePreset = async (presetId: number) => {
    if (confirm('Delete this preset?')) {
      await deletePreset.mutateAsync(presetId)
    }
  }

  // Loading state
  if (presetsLoading && presets.length === 0) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ScreenContainer>
    )
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-destructive mb-2">Failed to load presets</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer className="p-4 space-y-4">
      {/* Master controls */}
      {state && (
        <MasterControls
          isOn={state.on}
          brightness={state.bri}
          onToggle={toggle}
          onBrightnessChange={setBrightness}
        />
      )}

      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Light Shows</h2>
        <Button size="sm" onClick={onCreatePreset}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {/* Preset list */}
      {presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Light Shows Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first light show to get started
          </p>
          <Button onClick={onCreatePreset}>
            <Plus className="h-4 w-4 mr-2" />
            Create Light Show
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              isActive={state?.ps === preset.id}
              isLoading={loadingPresetId === preset.id}
              onActivate={() => handleActivatePreset(preset.id)}
              onEdit={() => onEditPreset?.(preset.id)}
              onDelete={() => handleDeletePreset(preset.id)}
            />
          ))}
        </div>
      )}
    </ScreenContainer>
  )
}
