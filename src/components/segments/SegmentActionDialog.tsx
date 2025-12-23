import { useState, useEffect } from 'react'
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
import { validateMerge } from '@/lib/segmentDefinitions'
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

  // Merge state
  const [mergeTargetId, setMergeTargetId] = useState<string>('')
  const [mergeName, setMergeName] = useState('')

  // Group states
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>()
  const [groupName, setGroupName] = useState('')

  // Compute validation errors (no setState in effects)
  const mergeError =
    mode === 'merge' && segment && mergeTargetId
      ? (() => {
          const target = segments.find((s) => s.id === mergeTargetId)
          if (!target) return undefined
          const validation = validateMerge(segment, target)
          return validation.valid ? undefined : validation.error
        })()
      : undefined

  // Set default merge name when target is selected
  useEffect(() => {
    if (mode === 'merge' && segment && mergeTargetId && !mergeError) {
      setMergeName(segment.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, segment?.name, mergeTargetId, mergeError])

  const handleSplit = (splitPosition: number) => {
    if (segment) {
      addSplitPoint(segment.id, splitPosition)
      onClose()
    }
  }

  const handleMerge = () => {
    if (segment && mergeTargetId && !mergeError) {
      mergeSegments(segment.id, mergeTargetId, mergeName)
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
      id: segment.id,
      start: segment.start,
      stop: segment.stop,
      n: segment.name,
    }

    return (
      <SplitSegmentDialog
        open={true}
        segment={segmentToSplit}
        onSplit={handleSplit}
        onCancel={onClose}
      />
    )
  }

  // Get adjacent segments for merge
  const adjacentSegments = segment
    ? segments.filter(
        (s) =>
          s.id !== segment.id &&
          (s.stop === segment.start || s.start === segment.stop)
      )
    : []

  return (
    <Dialog open={!!mode} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'merge' && 'Merge Segments'}
            {mode === 'assign-group' && 'Assign to Group'}
            {mode === 'create-group' && 'Create Group'}
            {mode === 'rename-group' && 'Rename Group'}
            {mode === 'delete-group' && 'Delete Group'}
          </DialogTitle>
        </DialogHeader>

        {/* Merge Mode */}
        {mode === 'merge' && segment && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Merge With</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select segment" />
                </SelectTrigger>
                <SelectContent>
                  {adjacentSegments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} (LEDs {s.start}–{s.stop - 1})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {mergeTargetId && (
              <div className="space-y-2">
                <Label htmlFor="merge-name">Merged Segment Name</Label>
                <Input
                  id="merge-name"
                  value={mergeName}
                  onChange={(e) => setMergeName(e.target.value)}
                  placeholder="Enter name"
                />
              </div>
            )}
            {mergeError && (
              <p className="text-sm text-destructive">{mergeError}</p>
            )}
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
          {mode === 'merge' && (
            <Button onClick={handleMerge} disabled={!!mergeError || !mergeTargetId}>
              Merge
            </Button>
          )}
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
