import { useState } from 'react'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { SegmentRow } from '@/components/common'
import { SegmentActionDialog, type ActionMode } from './SegmentActionDialog'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'

interface GlobalSegmentRowProps {
  segment: GlobalSegment
  segments: GlobalSegment[]
  groups: SegmentGroup[]
  ledCount: number
}

export function GlobalSegmentRow({
  segment,
  segments,
  groups,
  ledCount,
}: GlobalSegmentRowProps) {
  const { renameSegment } = useSegmentDefinitions(segment.controllerId)
  const [actionMode, setActionMode] = useState<ActionMode | null>(null)

  // Determine which merge actions are available
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start)
  const segmentIndex = sortedSegments.findIndex((s) => s.id === segment.id)

  const prevSegment = segmentIndex > 0 ? sortedSegments[segmentIndex - 1] : null
  const nextSegment = segmentIndex < sortedSegments.length - 1 ? sortedSegments[segmentIndex + 1] : null

  const canMergeUp = prevSegment !== null && prevSegment.stop === segment.start
  const canMergeDown = nextSegment !== null && nextSegment.start === segment.stop

  // Can split if segment has more than 1 LED
  const canSplit = (segment.stop - segment.start) > 1

  return (
    <>
      <SegmentRow
        segment={segment}
        ledCount={ledCount}
        allowNameEditing
        onNameChange={(newName) => renameSegment(segment.id, newName)}
        canSplit={canSplit}
        canMergeUp={canMergeUp}
        canMergeDown={canMergeDown}
        showGroupButton
        onClick={undefined} // No click action for global segments
        onSplit={() => setActionMode('split')}
        onMergeUp={canMergeUp ? () => setActionMode('merge') : undefined}
        onMergeDown={canMergeDown ? () => setActionMode('merge') : undefined}
        onGroup={() => setActionMode('assign-group')}
      />

      {/* Action dialog */}
      <SegmentActionDialog
        mode={actionMode}
        segment={segment}
        segments={segments}
        groups={groups}
        controllerId={segment.controllerId}
        ledCount={ledCount}
        onClose={() => setActionMode(null)}
      />
    </>
  )
}
