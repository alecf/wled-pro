import { useState, useCallback } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, Copy, Info } from 'lucide-react'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { usePresets, useSavePreset, useNextPresetId } from '@/hooks/usePresets'
import { useEffects } from '@/hooks/useEffects'
import { useWledPalettes } from '@/hooks/useWled'
import { SegmentList } from './SegmentList'
import { SegmentSplitter } from './SegmentSplitter'
import { SegmentEditor } from './SegmentEditor'
import type { Segment } from '@/types/wled'

export type EditorMode = 'current' | 'preset'

interface PresetEditorSheetProps {
  open: boolean
  onClose: () => void
  baseUrl: string
  mode: EditorMode
  presetId?: number
}

/**
 * Deep clone segments for local state
 */
function cloneSegments(segments: Segment[]): Segment[] {
  return segments.map((seg) => ({
    ...seg,
    col: seg.col?.map((c) => [...c] as [number, number, number]),
  }))
}

/**
 * Compare two segment arrays for equality
 */
function segmentsEqual(a: Segment[], b: Segment[]): boolean {
  if (a.length !== b.length) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Wrapper that remounts the editor content when opening
 * This ensures fresh state on each open
 */
export function PresetEditorSheet(props: PresetEditorSheetProps) {
  const key = props.open ? `open-${props.mode}-${props.presetId ?? 'none'}` : 'closed'

  return (
    <Drawer open={props.open} onOpenChange={(isOpen) => !isOpen && props.onClose()}>
      <DrawerContent className="max-h-[90vh]">
        {props.open && <PresetEditorContent key={key} {...props} />}
      </DrawerContent>
    </Drawer>
  )
}

type EditorView = 'segments' | 'split' | 'edit-segment'

interface EditorState {
  // Initial snapshot for reverting
  initialSegments: Segment[]
  initialOn: boolean
  initialBri: number
  // Local editing state
  localSegments: Segment[]
  // Whether we've captured the initial state
  initialized: boolean
}

function PresetEditorContent({
  onClose,
  baseUrl,
  mode,
  presetId,
}: PresetEditorSheetProps) {
  const { state, info, queueUpdate } = useWledWebSocket(baseUrl)
  const { presets } = usePresets(baseUrl)
  const { effects } = useEffects(baseUrl)
  const { data: palettes } = useWledPalettes(baseUrl)
  const savePreset = useSavePreset(baseUrl)
  const nextPresetId = useNextPresetId(baseUrl)

  // Combined editor state with lazy initialization
  const [editorState, setEditorState] = useState<EditorState>(() => ({
    initialSegments: [],
    initialOn: true,
    initialBri: 128,
    localSegments: [],
    initialized: false,
  }))

  // Live preview mode (always true for 'current' mode)
  const [isLivePreview, setIsLivePreview] = useState(mode === 'current')

  // Preset name (only for saving)
  const existingPreset = presetId !== undefined ? presets.find((p) => p.id === presetId) : null
  const [presetName, setPresetName] = useState(existingPreset?.n ?? '')

  // Navigation state
  const [view, setView] = useState<EditorView>('segments')
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null)
  const [splittingSegmentId, setSplittingSegmentId] = useState<number | null>(null)

  // Save As dialog state
  const [showSaveAs, setShowSaveAs] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')

  const maxLedCount = info?.leds.count ?? 150

  // Initialize from device state when we first get it
  // This is safe because it only runs once due to the initialized check
  if (state && !editorState.initialized) {
    const cloned = cloneSegments(state.seg)
    setEditorState({
      initialSegments: cloned,
      initialOn: state.on,
      initialBri: state.bri,
      localSegments: cloneSegments(state.seg), // Make a separate copy
      initialized: true,
    })
  }

  // Use local segments if initialized, otherwise show loading
  const segments = editorState.initialized ? editorState.localSegments : []

  // Create effect name map
  const effectNames = new Map<number, string>()
  effects?.forEach((e) => effectNames.set(e.id, e.name))

  // Apply segments to device
  const applyToDevice = useCallback(
    (segs: Segment[]) => {
      const segUpdates = segs.map((seg) => ({
        id: seg.id,
        start: seg.start,
        stop: seg.stop,
        fx: seg.fx,
        sx: seg.sx,
        ix: seg.ix,
        pal: seg.pal,
        col: seg.col,
        bri: seg.bri,
        c1: seg.c1,
        c2: seg.c2,
        c3: seg.c3,
      }))
      queueUpdate({ seg: segUpdates })
    },
    [queueUpdate]
  )

  // Revert device to initial state
  const revertToInitial = useCallback(() => {
    if (!editorState.initialized) return
    const segUpdates = editorState.initialSegments.map((seg) => ({
      id: seg.id,
      start: seg.start,
      stop: seg.stop,
      fx: seg.fx,
      sx: seg.sx,
      ix: seg.ix,
      pal: seg.pal,
      col: seg.col,
      bri: seg.bri,
      c1: seg.c1,
      c2: seg.c2,
      c3: seg.c3,
    }))
    queueUpdate({
      on: editorState.initialOn,
      bri: editorState.initialBri,
      seg: segUpdates,
    })
  }, [editorState, queueUpdate])

  // Handle live preview toggle
  const handleLivePreviewChange = (enabled: boolean) => {
    if (enabled) {
      applyToDevice(editorState.localSegments)
    } else {
      revertToInitial()
    }
    setIsLivePreview(enabled)
  }

  // Update a segment locally (and optionally push to device)
  const updateSegment = (segmentId: number, updates: Partial<Segment>) => {
    setEditorState((prev) => {
      const newSegments = prev.localSegments.map((seg) =>
        seg.id === segmentId ? { ...seg, ...updates } : seg
      )

      if (isLivePreview) {
        applyToDevice(newSegments)
      }

      return { ...prev, localSegments: newSegments }
    })
  }

  // Split a segment
  const handleConfirmSplit = (splitPoint: number) => {
    const segment = segments.find((s) => s.id === splittingSegmentId)
    if (!segment) return

    const usedIds = new Set(segments.map((s) => s.id))
    let newId = 0
    for (let i = 0; i <= 15; i++) {
      if (!usedIds.has(i)) {
        newId = i
        break
      }
    }

    setEditorState((prev) => {
      const newSegments = [
        ...prev.localSegments.map((seg) =>
          seg.id === segment.id ? { ...seg, stop: splitPoint } : seg
        ),
        {
          ...segment,
          id: newId,
          start: splitPoint,
          stop: segment.stop,
        },
      ].sort((a, b) => a.start - b.start)

      if (isLivePreview) {
        applyToDevice(newSegments)
      }

      return { ...prev, localSegments: newSegments }
    })

    setView('segments')
    setSplittingSegmentId(null)
  }

  // Merge segments
  const handleMergeSegments = (keepId: number, removeId: number) => {
    const keepSegment = segments.find((s) => s.id === keepId)
    const removeSegment = segments.find((s) => s.id === removeId)
    if (!keepSegment || !removeSegment) return

    const newStart = Math.min(keepSegment.start, removeSegment.start)
    const newStop = Math.max(keepSegment.stop, removeSegment.stop)

    setEditorState((prev) => {
      const newSegments = prev.localSegments
        .filter((s) => s.id !== removeId)
        .map((seg) =>
          seg.id === keepId ? { ...seg, start: newStart, stop: newStop } : seg
        )

      if (isLivePreview) {
        queueUpdate({
          seg: [
            { id: keepId, start: newStart, stop: newStop },
            { id: removeId, stop: 0 },
          ],
        })
      }

      return { ...prev, localSegments: newSegments }
    })
  }

  // Handle Cancel
  const handleCancel = () => {
    if (isLivePreview && editorState.initialized) {
      const hasChanges = !segmentsEqual(editorState.localSegments, editorState.initialSegments)
      if (hasChanges) {
        revertToInitial()
      }
    }
    onClose()
  }

  // Handle Save (for preset mode)
  const handleSave = async () => {
    if (mode !== 'preset' || presetId === undefined) return
    if (!presetName.trim()) return

    if (!isLivePreview) {
      applyToDevice(editorState.localSegments)
    }

    await savePreset.mutateAsync({
      id: presetId,
      name: presetName.trim(),
    })

    onClose()
  }

  // Handle Save As
  const handleSaveAs = async () => {
    if (!saveAsName.trim()) return

    const targetId = nextPresetId ?? 1

    if (!isLivePreview) {
      applyToDevice(editorState.localSegments)
    }

    await savePreset.mutateAsync({
      id: targetId,
      name: saveAsName.trim(),
    })

    setShowSaveAs(false)
    onClose()
  }

  const selectedSegment = selectedSegmentId !== null
    ? segments.find((s) => s.id === selectedSegmentId)
    : null

  const splittingSegment = splittingSegmentId !== null
    ? segments.find((s) => s.id === splittingSegmentId)
    : null

  const getTitle = () => {
    if (view === 'split') return 'Split Segment'
    if (view === 'edit-segment') return 'Edit Segment'
    if (mode === 'current') return 'Current State'
    return 'Edit Light Show'
  }

  if (!editorState.initialized || segments.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <DrawerHeader className="border-b">
        <div className="flex items-center gap-2">
          {view !== 'segments' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setView('segments')
                setSelectedSegmentId(null)
                setSplittingSegmentId(null)
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <DrawerTitle>{getTitle()}</DrawerTitle>
        </div>
      </DrawerHeader>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {view === 'segments' && (
          <>
            {mode === 'current' ? (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Editing the current running state. All changes are applied immediately.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
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

            <div className="space-y-2">
              <Label>Segments</Label>
              <SegmentList
                segments={segments}
                effectNames={effectNames}
                selectedSegmentId={selectedSegmentId ?? undefined}
                maxLedCount={maxLedCount}
                onSelectSegment={(id) => {
                  setSelectedSegmentId(id)
                  setView('edit-segment')
                }}
                onSplitSegment={(id) => {
                  setSplittingSegmentId(id)
                  setView('split')
                }}
                onMergeSegments={handleMergeSegments}
              />
            </div>
          </>
        )}

        {view === 'split' && splittingSegment && (
          <SegmentSplitter
            start={splittingSegment.start}
            stop={splittingSegment.stop}
            onSplit={handleConfirmSplit}
            onCancel={() => {
              setView('segments')
              setSplittingSegmentId(null)
            }}
          />
        )}

        {view === 'edit-segment' && selectedSegment && effects && (
          <SegmentEditor
            segment={selectedSegment}
            effects={effects}
            palettes={palettes ?? []}
            onUpdate={(updates) => updateSegment(selectedSegment.id, updates)}
          />
        )}

        {showSaveAs && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-4 rounded-lg w-80 space-y-4">
              <h3 className="font-semibold">Save As New Light Show</h3>
              <div className="space-y-2">
                <Label htmlFor="save-as-name">Name</Label>
                <Input
                  id="save-as-name"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  placeholder="New Light Show"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSaveAs(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveAs}
                  disabled={!saveAsName.trim() || savePreset.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {view === 'segments' && (
        <DrawerFooter className="border-t">
          {mode === 'current' ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSaveAsName('')
                setShowSaveAs(true)
              }}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Save As
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!presetName.trim() || savePreset.isPending}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSaveAsName(presetName ? `${presetName} Copy` : '')
                setShowSaveAs(true)
              }}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Save As
            </Button>
          </div>
        )}
        </DrawerFooter>
      )}
    </>
  )
}
