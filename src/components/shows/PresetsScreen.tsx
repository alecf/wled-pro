import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, Loader2, Pencil } from 'lucide-react'
import { usePresets, useLoadPreset, useDeletePreset, useResetPresets } from '@/hooks/usePresets'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { PresetCard } from './PresetCard'
import { MasterControls } from './MasterControls'

interface PresetsScreenProps {
  baseUrl: string
  onEditCurrentState?: () => void
  onEditPreset?: (presetId: number) => void
}

export function PresetsScreen({
  baseUrl,
  onEditCurrentState,
  onEditPreset,
}: PresetsScreenProps) {
  const { presets, isLoading: presetsLoading, error, refetch } = usePresets(baseUrl)
  const { state, toggle, setBrightness } = useWledWebSocket(baseUrl)
  const loadPreset = useLoadPreset(baseUrl)
  const deletePreset = useDeletePreset(baseUrl)
  const resetPresets = useResetPresets(baseUrl)

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

  const handleResetAllPresets = async () => {
    if (confirm('This will delete ALL presets on the device. This cannot be undone. Continue?')) {
      await resetPresets.mutateAsync()
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
    const isCorrupted = error.message.includes('Invalid JSON')
    return (
      <ScreenContainer className="p-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-destructive mb-2">Failed to load presets</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
            {isCorrupted && (
              <Button
                variant="destructive"
                onClick={handleResetAllPresets}
                disabled={resetPresets.isPending}
              >
                {resetPresets.isPending ? 'Resetting...' : 'Reset All Presets'}
              </Button>
            )}
          </div>
          {isCorrupted && (
            <p className="text-xs text-muted-foreground mt-4 max-w-xs">
              The presets file appears to be corrupted. Resetting will delete all presets on the device.
            </p>
          )}
        </div>
      </ScreenContainer>
    )
  }

  // Extract colors from current state segments for display
  const currentColors: string[] = []
  if (state?.seg) {
    for (const seg of state.seg) {
      if (seg.col) {
        for (const color of seg.col) {
          if (color && color.length >= 3) {
            const [r, g, b] = color
            if (r === 0 && g === 0 && b === 0) continue
            currentColors.push(`rgb(${r}, ${g}, ${b})`)
            if (currentColors.length >= 3) break
          }
        }
      }
      if (currentColors.length >= 3) break
    }
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

      {/* Current State Card */}
      {state && (
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
          onClick={onEditCurrentState}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              {/* Color swatches */}
              <div className="flex -space-x-1">
                {currentColors.length > 0 ? (
                  currentColors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-background bg-muted" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium">Current State</h3>
                <p className="text-xs text-muted-foreground">
                  {state.seg.length} segment{state.seg.length !== 1 ? 's' : ''} • Tap to edit & save
                </p>
              </div>

              {/* Edit icon */}
              <div className="text-muted-foreground">
                <Pencil className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <h2 className="text-lg font-semibold">Saved Light Shows</h2>

      {/* Preset list */}
      {presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No Saved Light Shows</h3>
          <p className="text-sm text-muted-foreground">
            Edit the current state above and save it as a light show
          </p>
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
