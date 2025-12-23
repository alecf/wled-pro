import { useState } from 'react'
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
import { Slider } from '@/components/ui/slider'

interface SegmentToSplit {
  id: number | string
  start: number
  stop: number
  n?: string // Optional name from WLED or global definition
}

interface SplitSegmentDialogProps {
  open: boolean
  segment: SegmentToSplit | null
  allSegments?: SegmentToSplit[] // All segments to calculate next available ID
  onSplit: (splitPoint: number) => void
  onCancel: () => void
}

export function SplitSegmentDialog({
  open,
  segment,
  allSegments = [],
  onSplit,
  onCancel,
}: SplitSegmentDialogProps) {
  const midpoint = segment
    ? Math.floor((segment.start + segment.stop) / 2)
    : 0
  const [splitPosition, setSplitPosition] = useState(midpoint)

  // Reset split position when segment changes
  if (segment && splitPosition !== midpoint && splitPosition <= segment.start) {
    setSplitPosition(midpoint)
  }

  const handleSliderChange = ([value]: number[]) => {
    setSplitPosition(value)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!segment) return
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value > segment.start && value < segment.stop) {
      setSplitPosition(value)
    }
  }

  const handleSplit = () => {
    if (!segment) return
    if (splitPosition > segment.start && splitPosition < segment.stop) {
      onSplit(splitPosition)
    }
  }

  if (!segment) return null

  // Calculate next available segment ID (WLED segments use numeric IDs 0-9)
  // For global segments (string UUIDs), just use "New Segment"
  const numericIds = allSegments
    .map((s) => s.id)
    .filter((id): id is number => typeof id === 'number')

  const usedIds = new Set(numericIds)
  let nextId: number | null = null

  // Only calculate numeric next ID if we're working with numeric IDs
  if (typeof segment.id === 'number') {
    for (let i = 0; i <= 9; i++) {
      if (!usedIds.has(i)) {
        nextId = i
        break
      }
    }
    // Fallback: if we couldn't find an unused ID (or allSegments wasn't provided),
    // use current ID + 1 as a reasonable guess
    if (nextId === null) {
      nextId = Math.min(segment.id + 1, 9)
    }
  }

  // Determine segment names for preview
  // If segment has a name, use it for first part
  // For second segment:
  //   - If we have a numeric next ID: "Segment {nextId}"
  //   - Otherwise: "New Segment"
  const segmentId = typeof segment.id === 'number' ? segment.id : 0
  const firstName = segment.n || `Segment ${segmentId}`
  const secondName = nextId !== null ? `Segment ${nextId}` : 'New Segment'

  // Calculate LED counts (exclusive stop means stop - 1 is last LED)
  const firstCount = splitPosition - segment.start
  const secondCount = segment.stop - splitPosition

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split Segment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visual preview bar */}
          <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
            <div
              className="absolute top-0 bottom-0 left-0 bg-primary/40"
              style={{
                width: `${((splitPosition - segment.start) / (segment.stop - segment.start)) * 100}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-secondary/40"
              style={{
                width: `${((segment.stop - splitPosition) / (segment.stop - segment.start)) * 100}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-foreground"
              style={{
                left: `calc(${((splitPosition - segment.start) / (segment.stop - segment.start)) * 100}%)`,
              }}
            />
          </div>

          {/* Slider and input */}
          <div className="space-y-2">
            <Label>Split Position: {splitPosition}</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[splitPosition]}
                min={segment.start + 1}
                max={segment.stop - 1}
                step={1}
                onValueChange={handleSliderChange}
                className="flex-1"
              />
              <Input
                type="number"
                value={splitPosition}
                min={segment.start + 1}
                max={segment.stop - 1}
                onChange={handleInputChange}
                className="w-20 text-right"
              />
            </div>
          </div>

          {/* Result preview with segment names */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="font-medium mb-1 truncate" title={firstName}>
                {firstName}
              </div>
              <div className="text-sm text-muted-foreground">
                {segment.start}–{splitPosition - 1}
              </div>
              <div className="text-xs text-muted-foreground">
                {firstCount} LED{firstCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg">
              <div className="font-medium mb-1 truncate" title={secondName}>
                {secondName}
              </div>
              <div className="text-sm text-muted-foreground">
                {splitPosition}–{segment.stop - 1}
              </div>
              <div className="text-xs text-muted-foreground">
                {secondCount} LED{secondCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSplit}>Split Segment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
