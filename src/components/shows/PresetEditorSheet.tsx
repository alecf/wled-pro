import { useState } from 'react'
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
import { ArrowLeft, Save } from 'lucide-react'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { usePresets, useSavePreset, useNextPresetId } from '@/hooks/usePresets'
import { useEffects } from '@/hooks/useEffects'
import { useWledPalettes } from '@/hooks/useWled'
import { SegmentList } from './SegmentList'
import { SegmentSplitter } from './SegmentSplitter'
import { SegmentEditor } from './SegmentEditor'
import type { Segment, WledStateUpdate } from '@/types/wled'

interface PresetEditorSheetProps {
  open: boolean
  onClose: () => void
  baseUrl: string
  presetId: number | null // null = create new
}

/**
 * Wrapper that remounts the editor content when opening
 * This ensures fresh state on each open
 */
export function PresetEditorSheet(props: PresetEditorSheetProps) {
  // Use a key based on open state and presetId to remount when opening
  const key = props.open ? `open-${props.presetId ?? 'new'}` : 'closed'

  return (
    <Drawer open={props.open} onOpenChange={(isOpen) => !isOpen && props.onClose()}>
      <DrawerContent className="max-h-[90vh]">
        {props.open && (
          <PresetEditorContent key={key} {...props} />
        )}
      </DrawerContent>
    </Drawer>
  )
}

type EditorView = 'segments' | 'split' | 'edit-segment'

function PresetEditorContent({
  onClose,
  baseUrl,
  presetId,
}: PresetEditorSheetProps) {
  const { state, info, queueUpdate } = useWledWebSocket(baseUrl)
  const { presets } = usePresets(baseUrl)
  const { effects } = useEffects(baseUrl)
  const { data: palettes } = useWledPalettes(baseUrl)
  const savePreset = useSavePreset(baseUrl)
  const nextPresetId = useNextPresetId(baseUrl)

  // Get initial preset name
  const initialName = presetId !== null
    ? (presets.find((p) => p.id === presetId)?.n ?? '')
    : ''

  const [presetName, setPresetName] = useState(initialName)
  const [view, setView] = useState<EditorView>('segments')
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null)
  const [splittingSegmentId, setSplittingSegmentId] = useState<number | null>(null)

  const isNewPreset = presetId === null
  const maxLedCount = info?.leds.count ?? 150

  // Get current segments from live state
  const segments = state?.seg ?? []

  // Create effect name map
  const effectNames = new Map<number, string>()
  effects?.forEach((e) => effectNames.set(e.id, e.name))

  // Handle segment split
  const handleSplitSegment = (segmentId: number) => {
    setSplittingSegmentId(segmentId)
    setView('split')
  }

  const handleConfirmSplit = (splitPoint: number) => {
    const segment = segments.find((s) => s.id === splittingSegmentId)
    if (!segment) return

    // Find next available segment ID
    const usedIds = new Set(segments.map((s) => s.id))
    let newId = 0
    for (let i = 0; i <= 9; i++) {
      if (!usedIds.has(i)) {
        newId = i
        break
      }
    }

    // Create the split update
    const update: WledStateUpdate = {
      seg: [
        // Update existing segment to end at split point
        { id: segment.id, stop: splitPoint },
        // Create new segment from split point with same settings
        {
          id: newId,
          start: splitPoint,
          stop: segment.stop,
          fx: segment.fx,
          sx: segment.sx,
          ix: segment.ix,
          pal: segment.pal,
          col: segment.col,
          c1: segment.c1,
          c2: segment.c2,
          c3: segment.c3,
        },
      ],
    }

    queueUpdate(update)
    setView('segments')
    setSplittingSegmentId(null)
  }

  // Handle segment merge
  const handleMergeSegments = (keepId: number, removeId: number) => {
    const keepSegment = segments.find((s) => s.id === keepId)
    const removeSegment = segments.find((s) => s.id === removeId)
    if (!keepSegment || !removeSegment) return

    // Extend the kept segment to cover both
    const newStart = Math.min(keepSegment.start, removeSegment.start)
    const newStop = Math.max(keepSegment.stop, removeSegment.stop)

    const update: WledStateUpdate = {
      seg: [
        // Extend the kept segment
        { id: keepId, start: newStart, stop: newStop },
        // Delete the removed segment by setting stop <= start
        { id: removeId, stop: 0 },
      ],
    }

    queueUpdate(update)
  }

  // Handle segment update from editor
  const handleSegmentUpdate = (segmentId: number, updates: Partial<Segment>) => {
    queueUpdate({
      seg: [{ id: segmentId, ...updates }],
    })
  }

  // Handle save
  const handleSave = async () => {
    if (!presetName.trim()) return

    const targetId = presetId ?? nextPresetId ?? 1

    await savePreset.mutateAsync({
      id: targetId,
      name: presetName.trim(),
    })

    onClose()
  }

  const selectedSegment = selectedSegmentId !== null
    ? segments.find((s) => s.id === selectedSegmentId)
    : null

  const splittingSegment = splittingSegmentId !== null
    ? segments.find((s) => s.id === splittingSegmentId)
    : null

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
          <DrawerTitle>
            {view === 'segments' && (isNewPreset ? 'New Light Show' : 'Edit Light Show')}
            {view === 'split' && 'Split Segment'}
            {view === 'edit-segment' && 'Edit Segment'}
          </DrawerTitle>
        </div>
      </DrawerHeader>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {view === 'segments' && (
          <>
            {/* Preset name */}
            <div className="space-y-2">
              <Label htmlFor="preset-name">Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="My Light Show"
              />
            </div>

            {/* Segment list */}
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
                onSplitSegment={handleSplitSegment}
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
            onUpdate={(updates) => handleSegmentUpdate(selectedSegment.id, updates)}
          />
        )}
      </div>

      <DrawerFooter className="border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
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
        </div>
      </DrawerFooter>
    </>
  )
}
