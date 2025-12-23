import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteGroupDialogProps {
  open: boolean
  groupName: string
  onDelete: () => void
  onClose: () => void
}

export function DeleteGroupDialog({
  open,
  groupName,
  onDelete,
  onClose,
}: DeleteGroupDialogProps) {
  const handleDelete = () => {
    onDelete()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Group</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete "{groupName}"? Segments will be
          unassigned but not deleted.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDelete} variant="destructive">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
