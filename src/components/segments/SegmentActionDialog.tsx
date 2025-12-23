import { useState } from 'react'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SplitSegmentDialog } from '@/components/common'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'

export type ActionMode =
  | 'split'
  | 'merge'
  | 'assign-group'
  | 'create-group'
  | 'rename-group'
  | 'delete-group'

interface SegmentActionDialogProps {
  mode: ActionMode | null
  segment?: GlobalSegment
  segments?: GlobalSegment[]
  groups?: SegmentGroup[]
  controllerId?: string
  ledCount?: number
  onClose: () => void
}

export function SegmentActionDialog({
  mode,
  segment,
  segments = [],
  groups = [],
  controllerId = '',
  onClose,
}: SegmentActionDialogProps) {
  const {
    addSplitPoint,
    mergeSegments,
    assignToGroup,
    addGroup,
    renameGroup,
    removeGroup,
  } = useSegmentDefinitions(controllerId)

  // Group states
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [groupName, setGroupName] = useState('')

  const handleSplit = (splitPosition: number) => {
    if (segment) {
      addSplitPoint(segment.id, splitPosition)
      onClose()
    }
  }

  const handleAssignGroup = () => {
    if (segment) {
      assignToGroup(segment.id, selectedGroupId)
      onClose()
    }
  }

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      addGroup(groupName.trim())
      onClose()
    }
  }

  const handleRenameGroup = () => {
    if (selectedGroupId && groupName.trim()) {
      renameGroup(selectedGroupId, groupName.trim())
      onClose()
    }
  }

  const handleDeleteGroup = () => {
    if (selectedGroupId) {
      removeGroup(selectedGroupId)
      onClose()
    }
  }

  if (!mode) return null

  // Handle split mode with shared component
  if (mode === 'split' && segment) {
    // Map GlobalSegment to SegmentToSplit format
    const segmentToSplit = {
      start: segment.start,
      stop: segment.stop,
      n: segment.name,
    }

    // Find segment index in sorted segments (for UI display)
    const sortedSegments = [...segments].sort((a, b) => a.start - b.start)
    const segmentIndex = sortedSegments.findIndex((s) => s.id === segment.id)

    return (
      <SplitSegmentDialog
        open={true}
        segment={segmentToSplit}
        segmentIndex={segmentIndex}
        onSplit={handleSplit}
        onCancel={onClose}
      />
    )
  }

  // Get adjacent segments for merge
  const segmentAbove = segment
    ? segments.find((s) => s.stop === segment.start)
    : undefined
  const segmentBelow = segment
    ? segments.find((s) => s.start === segment.stop)
    : undefined

  const handleMergeUp = () => {
    if (segment && segmentAbove) {
      // Merge into segment above (keep segmentAbove, remove current segment)
      mergeSegments(segment.id, segmentAbove.id, segmentAbove.name)
      onClose()
    }
  }

  const handleMergeDown = () => {
    if (segment && segmentBelow) {
      // Merge into segment below (keep segmentBelow, remove current segment)
      mergeSegments(segment.id, segmentBelow.id, segmentBelow.name)
      onClose()
    }
  }

  return (
    <Dialog open={!!mode} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'merge' && 'Merge Segment'}
            {mode === 'assign-group' && 'Assign to Group'}
            {mode === 'create-group' && 'Create Group'}
            {mode === 'rename-group' && 'Rename Group'}
            {mode === 'delete-group' && 'Delete Group'}
          </DialogTitle>
        </DialogHeader>

        {/* Merge Mode */}
        {mode === 'merge' && segment && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose which direction to merge:
            </p>
            <div className="flex flex-col gap-2">
              {segmentAbove && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleMergeUp}
                >
                  Merge up into {segmentAbove.name}
                </Button>
              )}
              {segmentBelow && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleMergeDown}
                >
                  Merge down into {segmentBelow.name}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Assign to Group Mode */}
        {mode === 'assign-group' && segment && (
          <div className="space-y-2">
            <Label>Group</Label>
            <Select
              value={selectedGroupId || 'none'}
              onValueChange={(value) =>
                setSelectedGroupId(value === 'none' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Group</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Create/Rename Group Mode */}
        {(mode === 'create-group' || mode === 'rename-group') && (
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
        )}

        {/* Delete Group Mode */}
        {mode === 'delete-group' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this group? Segments will be unassigned
              but not deleted.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode === 'assign-group' && (
            <Button onClick={handleAssignGroup}>Assign</Button>
          )}
          {mode === 'create-group' && (
            <Button onClick={handleCreateGroup} disabled={!groupName.trim()}>
              Create
            </Button>
          )}
          {mode === 'rename-group' && (
            <Button onClick={handleRenameGroup} disabled={!groupName.trim()}>
              Rename
            </Button>
          )}
          {mode === 'delete-group' && (
            <Button onClick={handleDeleteGroup} variant="destructive">
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
