import { useState } from 'react'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { SegmentRow } from '@/components/common/SegmentRow'
import { SplitSegmentDialog } from '@/components/common/SplitSegmentDialog'
import { MergeSegmentDialog } from './MergeSegmentDialog'
import { AssignToGroupDialog } from './AssignToGroupDialog'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'

interface GlobalSegmentRowProps {
  segment: GlobalSegment
  segments: GlobalSegment[]
  groups: SegmentGroup[]
  ledCount: number
  controllerId: string
}

export function GlobalSegmentRow({
  segment,
  segments,
  groups,
  ledCount,
  controllerId,
}: GlobalSegmentRowProps) {
  const { renameSegment, addSplitPoint, mergeSegments, assignToGroup } =
    useSegmentDefinitions(controllerId)

  // Dialog states
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [showAssignGroupDialog, setShowAssignGroupDialog] = useState(false)

  // Determine which merge actions are available
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start)
  const segmentIndex = sortedSegments.findIndex((s) => s.id === segment.id)

  const prevSegment = segmentIndex > 0 ? sortedSegments[segmentIndex - 1] : null
  const nextSegment = segmentIndex < sortedSegments.length - 1 ? sortedSegments[segmentIndex + 1] : null

  const canMergeUp = prevSegment !== null && prevSegment.stop === segment.start
  const canMergeDown = nextSegment !== null && nextSegment.start === segment.stop
  const canMerge = canMergeUp || canMergeDown

  // Can split if segment has more than 1 LED
  const canSplit = (segment.stop - segment.start) > 1

  // Adjacent segments for merge
  const segmentAbove = canMergeUp ? prevSegment : undefined
  const segmentBelow = canMergeDown ? nextSegment : undefined

  return (
    <>
      <SegmentRow
        segment={segment}
        ledCount={ledCount}
        allowNameEditing
        onNameChange={(newName) => renameSegment(segment.id, newName)}
        canSplit={canSplit}
        canMerge={canMerge}
        showGroupButton
        onClick={undefined} // No click action for global segments
        onSplit={() => setShowSplitDialog(true)}
        onMerge={canMerge ? () => setShowMergeDialog(true) : undefined}
        onGroup={() => setShowAssignGroupDialog(true)}
      />

      {/* Split dialog */}
      <SplitSegmentDialog
        open={showSplitDialog}
        segment={{
          start: segment.start,
          stop: segment.stop,
          n: segment.name,
        }}
        segmentIndex={segmentIndex}
        controllerId={controllerId}
        ledCount={ledCount}
        allSegments={segments.map((s) => ({ start: s.start, stop: s.stop }))}
        onSplit={(splitPosition) => {
          addSplitPoint(segment.id, splitPosition)
          setShowSplitDialog(false)
        }}
        onCancel={() => setShowSplitDialog(false)}
      />

      {/* Merge dialog */}
      <MergeSegmentDialog
        open={showMergeDialog}
        segmentAbove={segmentAbove}
        segmentBelow={segmentBelow}
        onMergeUp={
          segmentAbove
            ? () => {
                mergeSegments(segment.id, segmentAbove.id, segmentAbove.name)
                setShowMergeDialog(false)
              }
            : undefined
        }
        onMergeDown={
          segmentBelow
            ? () => {
                mergeSegments(segment.id, segmentBelow.id, segmentBelow.name)
                setShowMergeDialog(false)
              }
            : undefined
        }
        onClose={() => setShowMergeDialog(false)}
      />

      {/* Assign to group dialog */}
      <AssignToGroupDialog
        open={showAssignGroupDialog}
        groups={groups}
        currentGroupId={segment.groupId}
        onAssign={(groupId) => {
          assignToGroup(segment.id, groupId)
          setShowAssignGroupDialog(false)
        }}
        onClose={() => setShowAssignGroupDialog(false)}
      />
    </>
  )
}
