import { useState, useMemo } from 'react'
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
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { getSegmentLabel } from '@/lib/segmentLabeling'
import type { Segment } from '@/types/wled'

interface SegmentToSplit {
  start: number
  stop: number
  n?: string // Optional name from WLED or global definition
}

type SplitMode = 'snap' | 'freeform'

interface SegmentBoundary {
  start: number
  stop: number
}

interface SplitSegmentDialogProps {
  open: boolean
  segment: SegmentToSplit | null
  segmentIndex: number // 0-based position in list (for UI display)
  controllerId: string // Required for loading global segments
  ledCount: number // Total LEDs on the controller
  allSegments: SegmentBoundary[] // All segments for showing boundaries in preview
  onSplit: (splitPoint: number) => void
  onCancel: () => void
}

export function SplitSegmentDialog({
  open,
  segment,
  segmentIndex,
  controllerId,
  ledCount,
  allSegments,
  onSplit,
  onCancel,
}: SplitSegmentDialogProps) {
  const { segments: globalSegments } = useSegmentDefinitions(controllerId)
  const midpoint = segment
    ? Math.floor((segment.start + segment.stop) / 2)
    : 0
  const [splitPosition, setSplitPosition] = useState(midpoint)
  const [mode, setMode] = useState<SplitMode>('freeform')

  // Reset split position when segment changes
  if (segment && splitPosition !== midpoint && splitPosition <= segment.start) {
    setSplitPosition(midpoint)
  }

  // Calculate snap points from global segment boundaries
  const snapPoints = useMemo(() => {
    if (!segment) return []
    return globalSegments
      .map((g: { start: number }) => g.start)
      .filter((pos: number) => pos > segment.start && pos < segment.stop)
      .sort((a: number, b: number) => a - b)
  }, [globalSegments, segment])

  // Sorted globals for labeling (memoized for performance)
  const sortedGlobals = useMemo(
    () => [...globalSegments].sort((a, b) => a.start - b.start),
    [globalSegments]
  )

  const handleSliderChange = ([value]: number[]) => {
    if (mode === 'snap' && snapPoints.length > 0) {
      // Snap to nearest boundary
      const nearest = snapPoints.reduce(
        (prev: number, curr: number) =>
          Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      )
      setSplitPosition(nearest)
    } else {
      // Freeform mode - no snapping
      setSplitPosition(value)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!segment) return
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value) && value > segment.start && value < segment.stop) {
      setSplitPosition(value)
    }
  }

  // Generate labels for preview based on global definitions
  // Must be before early return to satisfy Rules of Hooks
  const previewLabel1 = useMemo(() => {
    if (!segment) return { display: '' }
    const previewSegment = {
      id: segmentIndex,
      start: segment.start,
      stop: splitPosition,
      len: splitPosition - segment.start,
      n: segment.n,
    } as Segment
    return getSegmentLabel(previewSegment, sortedGlobals, 30)
  }, [segment, splitPosition, sortedGlobals, segmentIndex])

  const previewLabel2 = useMemo(() => {
    if (!segment) return { display: '' }
    const previewSegment = {
      id: segmentIndex + 1,
      start: splitPosition,
      stop: segment.stop,
      len: segment.stop - splitPosition,
    } as Segment
    return getSegmentLabel(previewSegment, sortedGlobals, 30)
  }, [segment, splitPosition, sortedGlobals, segmentIndex])

  const handleSplit = () => {
    if (!segment) return
    if (splitPosition > segment.start && splitPosition < segment.stop) {
      onSplit(splitPosition)
    }
  }

  if (!segment) return null

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
          {/* Mode toggle */}
          {snapPoints.length > 0 && (
            <div className="flex items-center gap-2">
              <Label>Split mode:</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={mode === 'freeform' ? 'default' : 'outline'}
                  onClick={() => setMode('freeform')}
                >
                  Precise
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'snap' ? 'default' : 'outline'}
                  onClick={() => setMode('snap')}
                >
                  Snap to boundaries
                </Button>
              </div>
            </div>
          )}

          {/* Visual preview bar - shows entire controller with segment boundaries */}
          <div className="relative h-14 bg-muted rounded-lg overflow-hidden">
            {/* Highlight the segment being split */}
            <div
              className="absolute top-0 bottom-0 bg-primary/20"
              style={{
                left: `${(segment.start / ledCount) * 100}%`,
                width: `${((segment.stop - segment.start) / ledCount) * 100}%`,
              }}
            />
            {/* Show the two halves from split */}
            <div
              className="absolute top-0 bottom-0 bg-primary/30"
              style={{
                left: `${(segment.start / ledCount) * 100}%`,
                width: `${((splitPosition - segment.start) / ledCount) * 100}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 bg-secondary/30"
              style={{
                left: `${(splitPosition / ledCount) * 100}%`,
                width: `${((segment.stop - splitPosition) / ledCount) * 100}%`,
              }}
            />
            {/* Existing segment boundaries - thin short lines */}
            {allSegments.map((seg, i) => (
              <div key={`seg-${i}`}>
                {seg.start > 0 && (
                  <div
                    className="absolute bottom-0 w-px h-3 bg-foreground/40"
                    style={{ left: `${(seg.start / ledCount) * 100}%` }}
                  />
                )}
                {seg.stop < ledCount && (
                  <div
                    className="absolute bottom-0 w-px h-3 bg-foreground/40"
                    style={{ left: `${(seg.stop / ledCount) * 100}%` }}
                  />
                )}
              </div>
            ))}
            {/* New split point - tall bold line */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-foreground -translate-x-1/2"
              style={{
                left: `${(splitPosition / ledCount) * 100}%`,
              }}
            />
          </div>

          {/* Slider and input with snap point markers */}
          <div className="space-y-2">
            <Label>Split Position: {splitPosition}</Label>
            <div className="relative pt-6">
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

              {/* Snap point markers */}
              {mode === 'snap' &&
                snapPoints.map((pos: number) => (
                  <div
                    key={pos}
                    className="absolute top-0 w-px h-4 bg-primary pointer-events-none"
                    style={{
                      left: `${((pos - segment.start) / (segment.stop - segment.start)) * 100}%`,
                    }}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono text-muted-foreground">
                      {pos}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Result preview with segment labels from global definitions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-primary/10 rounded-lg">
              <div
                className="font-medium mb-1 truncate"
                title={previewLabel1.tooltip || previewLabel1.display}
              >
                {previewLabel1.display}
              </div>
              <div className="text-sm text-muted-foreground">
                {segment.start}–{splitPosition - 1}
              </div>
              <div className="text-xs text-muted-foreground">
                {firstCount} LED{firstCount !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg">
              <div
                className="font-medium mb-1 truncate"
                title={previewLabel2.tooltip || previewLabel2.display}
              >
                {previewLabel2.display}
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
