import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface MergeSegmentDialogProps {
  open: boolean
  segmentAbove?: { name: string }
  segmentBelow?: { name: string }
  onMergeUp?: () => void
  onMergeDown?: () => void
  onClose: () => void
}

export function MergeSegmentDialog({
  open,
  segmentAbove,
  segmentBelow,
  onMergeUp,
  onMergeDown,
  onClose,
}: MergeSegmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Segment</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose which direction to merge:
          </p>
          <div className="flex flex-col gap-2">
            {segmentAbove && onMergeUp && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onMergeUp}
              >
                Merge up into {segmentAbove.name}
              </Button>
            )}
            {segmentBelow && onMergeDown && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={onMergeDown}
              >
                Merge down into {segmentBelow.name}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
