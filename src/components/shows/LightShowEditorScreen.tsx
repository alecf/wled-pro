import { Copy, Info, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ActionButtonBar } from '@/components/common/ActionButtonBar'
import { ErrorState } from '@/components/common/ErrorState'
import { InfoBox } from '@/components/common/InfoBox'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { SimpleInputDialog } from '@/components/common/SimpleInputDialog'
import { SplitSegmentDialog } from '@/components/common/SplitSegmentDialog'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useControllerContext } from '@/contexts/ControllerContext'
import { useEffects } from '@/hooks/useEffects'
import { useNextPresetId, usePresets, useSavePreset } from '@/hooks/usePresets'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { useSegmentOperations } from '@/hooks/useSegmentOperations'
import { useWledPalettesWithColors } from '@/hooks/useWled'
import { globalSegmentsToWledSegments, hasOneBigSegment } from '@/lib/lightshow'
import { getSegmentLabel } from '@/lib/segmentLabeling'
import { repairSegments, toSegment } from '@/lib/segmentUtils'
import { segmentsToDeviceUpdate } from '@/lib/wled-state'
import type { ParsedPreset, Segment } from '@/types/wled'
import { SegmentEditorScreen } from './SegmentEditorScreen'
import { SegmentList } from './SegmentList'

type EditorMode = 'current' | 'preset'

type EditorView = 'list' | 'edit-segment'

interface LightShowEditorScreenProps {
  baseUrl: string
  controllerId: string
  mode: EditorMode
  presetId?: number
  onClose: () => void
}

/**
 * Editor for the device's current state or a saved preset.
 *
 * - current: edits start from the device's segments and are applied live.
 * - preset: edits start from the preset's stored segments. Live preview is
 *   off by default; turning it on shows the edited preset on the device, and
 *   turning it off (or cancelling) restores what the device showed before.
 *
 * Saving applies the edited segments and saves them as the preset in one
 * request, so the device ends up showing the saved light show.
 */
export function LightShowEditorScreen(props: LightShowEditorScreenProps) {
  const { state, info } = useControllerContext()
  const { presets, isLoading: presetsLoading } = usePresets(props.baseUrl)

  if (!state || !info || (props.mode === 'preset' && presetsLoading)) {
    return <LoadingScreen message="Loading..." />
  }

  let initialSegments = state.seg.filter((seg) => seg.stop > seg.start)
  let initialName = ''
  let presetSettings: PresetSettings = {}
  if (props.mode === 'preset') {
    const preset = presets.find((p) => p.id === props.presetId)
    if (!preset) {
      return (
        <div className="min-h-screen flex flex-col">
          <PageHeader title="Light Show" onBack={props.onClose} />
          <ErrorState
            title="Light show not found"
            message={`There is no saved light show with ID ${props.presetId}.`}
          />
        </div>
      )
    }
    initialName = preset.n
    initialSegments = presetToSegments(preset, state.seg, info.leds.count) ?? initialSegments
    // Saving captures the device's power/brightness, so re-apply the preset's own
    presetSettings = { on: preset.on ?? true, bri: preset.bri, quickLabel: preset.ql }
  }

  return (
    <LightShowEditor
      key={`${props.mode}-${props.presetId}`}
      {...props}
      initialSegments={initialSegments}
      initialName={initialName}
      presetSettings={presetSettings}
    />
  )
}

/** Preset-level settings kept when an existing preset is saved again */
interface PresetSettings {
  on?: boolean
  bri?: number
  quickLabel?: string
}

/**
 * Full segments for a preset. Fields the preset didn't store (e.g. bounds of
 * presets saved without them) come from the device's segment with the same ID.
 * Returns null when the preset has no segments (e.g. a playlist).
 */
function presetToSegments(
  preset: ParsedPreset,
  deviceSegments: Segment[],
  ledCount: number,
): Segment[] | null {
  const segments = (preset.seg ?? [])
    .map((seg, index) => {
      const device = deviceSegments.find((d) => d.id === (seg.id ?? index))
      // The name isn't a missing field: a preset segment without one is unnamed
      return toSegment({ ...device, n: undefined, ...seg }, index, ledCount)
    })
    .filter((seg) => seg.stop > seg.start)
  return segments.length > 0 ? segments : null
}

interface DeviceSnapshot {
  seg: Segment[]
  on: boolean
  bri: number
}

function LightShowEditor({
  baseUrl,
  controllerId,
  mode,
  presetId,
  onClose,
  initialSegments,
  initialName,
  presetSettings,
}: LightShowEditorScreenProps & {
  initialSegments: Segment[]
  initialName: string
  presetSettings: PresetSettings
}) {
  const { state, info, queueUpdate, flushUpdates } = useControllerContext()
  const { effects } = useEffects(baseUrl)
  const { data: palettes } = useWledPalettesWithColors(baseUrl)
  const savePreset = useSavePreset(baseUrl)
  const nextPresetId = useNextPresetId(baseUrl)
  const { segments: globalSegments } = useSegmentDefinitions(controllerId)

  const [view, setView] = useState<EditorView>('list')
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [presetName, setPresetName] = useState(initialName)

  // What the device showed when the editor opened, for Cancel / live preview off
  const [deviceSnapshot] = useState<DeviceSnapshot | null>(() =>
    state ? { seg: state.seg, on: state.on, bri: state.bri } : null,
  )
  const [isLivePreview, setIsLivePreview] = useState(mode === 'current')
  const isLivePreviewRef = useRef(isLivePreview)
  useEffect(() => {
    isLivePreviewRef.current = isLivePreview
  }, [isLivePreview])
  // Whether the device may differ from deviceSnapshot because of this editor
  const deviceChangedRef = useRef(false)

  // Latest device segment IDs, so removed segments can be deleted on the device
  const deviceSegmentIdsRef = useRef<number[]>([])
  useEffect(() => {
    deviceSegmentIdsRef.current = state?.seg.map((s) => s.id) ?? []
  }, [state?.seg])
  // Segment IDs this editor has sent to the device as existing. `state` can lag
  // behind (or drop) a segment the editor just created, and a request that
  // deleted one may have failed, so ids are never forgotten: every update deletes
  // any of them the editor no longer has. Repeated deletes are harmless: WLED
  // ignores `stop: 0` for a slot that doesn't exist, and one for an inactive slot
  // only counts towards a purge, which can't renumber the kept ids `0..n-1`
  // (they're all active by then).
  const sentSegmentIdsRef = useRef<Set<number>>(new Set())

  /** `seg` update that makes the device's segments match `segs` */
  const toDeviceSegments = useCallback((segs: Segment[]) => {
    const update = segmentsToDeviceUpdate(segs, [
      ...deviceSegmentIdsRef.current,
      ...sentSegmentIdsRef.current,
    ])
    for (const seg of update) {
      if (seg.id !== undefined && seg.stop !== 0) sentSegmentIdsRef.current.add(seg.id)
    }
    return update
  }, [])

  const ledCount = info?.leds.count ?? 150

  const applyToDevice = useCallback(
    (segs: Segment[]) => {
      deviceChangedRef.current = true
      queueUpdate({ seg: toDeviceSegments(segs) })
    },
    [queueUpdate, toDeviceSegments],
  )

  const handleSegmentsChange = useCallback(
    (newSegments: Segment[]) => {
      if (isLivePreviewRef.current) {
        applyToDevice(newSegments)
      }
    },
    [applyToDevice],
  )

  const segmentOps = useSegmentOperations({
    initialSegments,
    onSegmentsChange: handleSegmentsChange,
  })
  const segments = segmentOps.segments

  const effectNames = useMemo(() => {
    const map = new Map<number, string>()
    for (const e of effects ?? []) map.set(e.id, e.name)
    return map
  }, [effects])

  /** Put the device back the way it was when the editor opened */
  const restoreDevice = useCallback(() => {
    if (!deviceSnapshot || !deviceChangedRef.current) return
    deviceChangedRef.current = false
    queueUpdate({
      on: deviceSnapshot.on,
      bri: deviceSnapshot.bri,
      seg: toDeviceSegments(deviceSnapshot.seg),
    })
  }, [deviceSnapshot, queueUpdate, toDeviceSegments])

  const handleLivePreviewChange = (enabled: boolean) => {
    setIsLivePreview(enabled)
    if (enabled) {
      applyToDevice(segments)
    } else {
      restoreDevice()
    }
  }

  const handleConfirmSplit = useCallback(
    (splitPoint: number) => {
      if (selectedSegmentId === null) return
      segmentOps.splitSegment(selectedSegmentId, splitPoint)
      setShowSplitDialog(false)
      setSelectedSegmentId(null)
    },
    [selectedSegmentId, segmentOps],
  )

  const handleApplyGlobalSegments = useCallback(() => {
    if (globalSegments.length === 0) return
    segmentOps.setAllSegments(globalSegmentsToWledSegments(globalSegments, segments[0]))
  }, [globalSegments, segments, segmentOps])

  // Cancel discards edits; in live preview that means restoring the device
  const handleCancel = () => {
    restoreDevice()
    onClose()
  }

  /** Apply the edited segments and save them as preset `id` in one request */
  const save = async (id: number, name: string) => {
    // Send any pending live-preview update first so it can't land after the save
    await flushUpdates()
    const { on, bri, quickLabel } = presetSettings
    try {
      await savePreset.mutateAsync({
        id,
        name,
        // Only overwriting the preset keeps its quick load label
        quickLabel: id === presetId ? quickLabel : undefined,
        state: {
          ...(on !== undefined && { on }),
          ...(bri !== undefined && { bri }),
          seg: toDeviceSegments(repairSegments(segments, ledCount)),
        },
      })
    } catch (error) {
      toast.error(`Failed to save "${name}"`)
      console.error(error)
      return
    }
    toast.success(`Saved "${name}"`)
    onClose()
  }

  const handleSave = () => {
    if (presetId === undefined || !presetName.trim()) return
    return save(presetId, presetName.trim())
  }

  const handleSaveAs = (name: string) => {
    if (nextPresetId === null) {
      toast.error('All 250 preset slots are in use')
      return
    }
    return save(nextPresetId, name)
  }

  const getTitle = () => {
    if (mode === 'current') return 'Current State'
    return initialName || 'Edit Light Show'
  }

  // Check if we should show the "Apply Global Segments" button
  const showApplyGlobalSegments = globalSegments.length > 0 && hasOneBigSegment(segments, ledCount)

  // Find the selected segment and its index for sub-screens
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start)
  const selectedSegment =
    selectedSegmentId !== null ? segments.find((s) => s.id === selectedSegmentId) : null
  const selectedSegmentIndex = selectedSegment
    ? sortedSegments.findIndex((s) => s.id === selectedSegmentId)
    : -1

  // Segment editor view
  if (view === 'edit-segment' && selectedSegment && effects) {
    return (
      <SegmentEditorScreen
        segment={selectedSegment}
        title={getSegmentLabel(selectedSegment, globalSegments, 40).display}
        namePlaceholder={getSegmentLabel({ ...selectedSegment, n: '' }, globalSegments, 40).display}
        effects={effects}
        palettes={palettes ?? []}
        onUpdate={(updates) => segmentOps.updateSegment(selectedSegment.id, updates)}
        onBack={() => {
          setView('list')
          setSelectedSegmentId(null)
        }}
      />
    )
  }

  // Main list view
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader title={getTitle()} onBack={mode === 'current' ? onClose : handleCancel} />

      <ScreenContainer className="p-4 space-y-4">
        {mode === 'current' ? (
          <InfoBox
            variant="info"
            icon={Info}
            description="Editing the current running state. All changes are applied immediately."
          />
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted/50">
            <Label htmlFor="live-preview" className="text-sm font-medium">
              Live Preview
            </Label>
            <Switch
              id="live-preview"
              checked={isLivePreview}
              onCheckedChange={handleLivePreviewChange}
            />
          </div>
        )}

        {mode === 'preset' && (
          <div className="space-y-2">
            <Label htmlFor="preset-name">Name</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My Light Show"
            />
          </div>
        )}

        {showApplyGlobalSegments && (
          <InfoBox
            variant="info"
            title="Apply Your Saved Layout"
            description={`Split this single segment into ${globalSegments.length} segments based on your saved global segment layout`}
            action={{
              label: 'Apply Global Segments',
              onClick: handleApplyGlobalSegments,
            }}
          />
        )}

        <div className="space-y-2">
          <Label>Segments</Label>
          <SegmentList
            segments={segments}
            effectNames={effectNames}
            effects={effects}
            palettes={palettes ?? []}
            globalSegments={globalSegments}
            maxLedCount={ledCount}
            onSelectSegment={(id) => {
              setSelectedSegmentId(id)
              setView('edit-segment')
            }}
            onSplitSegment={(id) => {
              setSelectedSegmentId(id)
              setShowSplitDialog(true)
            }}
            onMergeSegments={segmentOps.mergeSegments}
            onMergeGapUp={segmentOps.mergeGapUp}
            onMergeGapDown={segmentOps.mergeGapDown}
            onConvertGapToSegment={segmentOps.convertGapToSegment}
          />
        </div>
      </ScreenContainer>

      {/* Footer */}
      <ActionButtonBar
        buttons={
          mode === 'current'
            ? [
                { label: 'Cancel', variant: 'outline', onClick: handleCancel },
                {
                  label: 'Save As',
                  icon: Copy,
                  onClick: () => setShowSaveAs(true),
                },
              ]
            : [
                { label: 'Cancel', variant: 'outline', onClick: handleCancel },
                {
                  label: 'Save',
                  icon: Save,
                  onClick: handleSave,
                  disabled: !presetName.trim() || savePreset.isPending,
                },
                {
                  label: 'Save As',
                  icon: Copy,
                  variant: 'secondary',
                  onClick: () => setShowSaveAs(true),
                },
              ]
        }
      />

      {/* Split Segment Dialog */}
      <SplitSegmentDialog
        open={showSplitDialog}
        segment={
          selectedSegment
            ? {
                start: selectedSegment.start,
                stop: selectedSegment.stop,
                n: selectedSegment.n,
              }
            : null
        }
        segmentIndex={selectedSegmentIndex}
        controllerId={controllerId}
        ledCount={ledCount}
        allSegments={segments.map((s) => ({ start: s.start, stop: s.stop }))}
        onSplit={handleConfirmSplit}
        onCancel={() => {
          setShowSplitDialog(false)
          setSelectedSegmentId(null)
        }}
      />

      {/* Save As Dialog */}
      <SimpleInputDialog
        open={showSaveAs}
        onOpenChange={setShowSaveAs}
        title="Save As New Light Show"
        fieldLabel="Name"
        placeholder="New Light Show"
        defaultValue={mode === 'preset' && presetName ? `${presetName} Copy` : ''}
        onSubmit={handleSaveAs}
        submitLabel="Save"
      />
    </div>
  )
}
