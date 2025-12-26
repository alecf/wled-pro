import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Sparkles, Pencil } from 'lucide-react'
import { usePresets, useLoadPreset, useDeletePreset, useResetPresets } from '@/hooks/usePresets'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { PresetCard } from './PresetCard'
import { MasterControls } from './MasterControls'
import { List, ListItem, ListSection, LoadingScreen } from '@/components/common'
import { createDefaultSegment } from '@/lib/lightshow'

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
  const { state, info, toggle, setBrightness, queueUpdate } = useWledWebSocket(baseUrl)
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

  const handleCreateNewLightShow = () => {
    if (!info) return

    // Create a single segment covering the entire LED strip
    const newSegment = createDefaultSegment(info.leds.count)
    queueUpdate({ seg: [newSegment] })

    // Open the current state editor
    onEditCurrentState?.()
  }

  // Loading state
  if (presetsLoading && presets.length === 0) {
    return <LoadingScreen />
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

      {/* Current State */}
      {state && (
        <List>
          <ListItem onClick={onEditCurrentState}>
            <div className="flex items-center gap-3 min-h-[52px]">
              {/* Color swatches */}
              <div className="flex -space-x-1">
                {currentColors.length > 0 ? (
                  currentColors.map((color, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-background bg-muted" />
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
                <Pencil className="h-5 w-5" />
              </div>
            </div>
          </ListItem>
        </List>
      )}

      {/* Preset list */}
      {presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No Saved Light Shows</h3>
          <p className="text-sm text-muted-foreground">
            Edit the current state above and save it as a light show
          </p>
        </div>
      ) : (
        <ListSection title="Saved Light Shows">
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
        </ListSection>
      )}

      {/* Create New Light Show button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={handleCreateNewLightShow}
        disabled={!info}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Create New Light Show
      </Button>
    </ScreenContainer>
  )
}
