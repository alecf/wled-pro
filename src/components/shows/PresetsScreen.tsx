import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Sparkles, Pencil } from 'lucide-react'
import { usePresets, useLoadPreset, useDeletePreset, useResetPresets } from '@/hooks/usePresets'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { useWledMutation } from '@/hooks/useWled'
import { PresetCard } from './PresetCard'
import { MasterControls } from './MasterControls'
import { List, ListItem, ListSection } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { EmptyState } from '@/components/common/EmptyState'
import { createDefaultSegment } from '@/lib/lightshow'
import { toast } from 'sonner'

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
  const mutation = useWledMutation(baseUrl)

  const [loadingPresetId, setLoadingPresetId] = useState<number | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [presetToDelete, setPresetToDelete] = useState<number | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

  const handleActivatePreset = async (presetId: number) => {
    setLoadingPresetId(presetId)
    try {
      await loadPreset.mutateAsync(presetId)
    } finally {
      setLoadingPresetId(null)
    }
  }

  const handleDeletePreset = (presetId: number) => {
    setPresetToDelete(presetId)
    setDeleteConfirmOpen(true)
  }

  const confirmDeletePreset = async () => {
    if (presetToDelete !== null) {
      await deletePreset.mutateAsync(presetToDelete)
      setPresetToDelete(null)
    }
  }

  const confirmResetAllPresets = async () => {
    await resetPresets.mutateAsync()
  }

  const handleCreateNewLightShow = () => {
    if (!info) return

    // Create a single segment covering the entire LED strip
    const newSegment = createDefaultSegment(info.leds.count)
    queueUpdate({ seg: [newSegment] })

    // Open the current state editor
    onEditCurrentState?.()
  }

  const handleActivateSleepTimer = async () => {
    if (!state) return

    // Activate the sleep timer with current settings
    const duration = state.nl.dur
    const mode = state.nl.mode
    const targetBrightness = state.nl.tbri

    try {
      await mutation.mutateAsync({
        nl: {
          on: true,
          dur: duration,
          mode: mode,
          tbri: targetBrightness,
        },
      })

      // Format duration for toast message
      const formatDuration = (minutes: number): string => {
        if (minutes < 60) {
          return `${minutes} minute${minutes !== 1 ? 's' : ''}`
        }
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (mins === 0) {
          return `${hours} hour${hours !== 1 ? 's' : ''}`
        }
        return `${hours}h ${mins}m`
      }

      toast.success(`Timer started for ${formatDuration(duration)}`)
    } catch (error) {
      toast.error('Failed to start timer')
      console.error(error)
    }
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
        <ErrorState
          title="Failed to load presets"
          message={error.message}
          onRetry={() => refetch()}
        />
        {isCorrupted && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <Button
              variant="destructive"
              onClick={() => setResetConfirmOpen(true)}
              disabled={resetPresets.isPending}
            >
              {resetPresets.isPending ? 'Resetting...' : 'Reset All Presets'}
            </Button>
            <p className="text-xs text-muted-foreground max-w-xs text-center">
              The presets file appears to be corrupted. Resetting will delete all presets on the device.
            </p>
          </div>
        )}
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
          onActivateSleepTimer={handleActivateSleepTimer}
          sleepTimerActive={state.nl.on}
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
        <EmptyState
          icon={Sparkles}
          title="No Saved Light Shows"
          description="Edit the current state above and save it as a light show"
        />
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

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Preset?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDeletePreset}
      />

      <ConfirmationDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset All Presets?"
        description="This will delete ALL presets on the device. This cannot be undone. Continue?"
        confirmLabel="Reset All"
        confirmVariant="destructive"
        onConfirm={confirmResetAllPresets}
      />
    </ScreenContainer>
  )
}
