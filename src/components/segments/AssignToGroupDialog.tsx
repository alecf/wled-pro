import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useState } from 'react'
import type { SegmentGroup } from '@/types/segments'

interface AssignToGroupDialogProps {
  open: boolean
  groups: SegmentGroup[]
  currentGroupId?: string
  onAssign: (groupId: string | undefined) => void
  onClose: () => void
}

export function AssignToGroupDialog({
  open,
  groups,
  currentGroupId,
  onAssign,
  onClose,
}: AssignToGroupDialogProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    currentGroupId
  )

  const handleAssign = () => {
    onAssign(selectedGroupId)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Group</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
