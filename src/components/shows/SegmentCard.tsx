import { Button } from '@/components/ui/button'
import { ChevronRight, Scissors, Merge } from 'lucide-react'
import { ColorSwatchRow, ListItem } from '@/components/common'
import { getSegmentLabel } from '@/lib/segmentLabeling'
import type { Segment } from '@/types/wled'
import type { GlobalSegment } from '@/types/segments'

interface SegmentCardProps {
  segment: Partial<Segment> & { id: number }
  effectName?: string
  globalSegments?: GlobalSegment[]
  isSelected?: boolean
  canSplit?: boolean
  canMergeUp?: boolean
  canMergeDown?: boolean
  onClick?: () => void
  onSplit?: () => void
  onMergeUp?: () => void
  onMergeDown?: () => void
}

export function SegmentCard({
  segment,
  effectName = 'Unknown',
  globalSegments = [],
  isSelected,
  canSplit = true,
  canMergeUp = false,
  canMergeDown = false,
  onClick,
  onSplit,
  onMergeUp,
  onMergeDown,
}: SegmentCardProps) {
  const start = segment.start ?? 0
  const stop = segment.stop ?? 0
  const colors = (segment.col || []).map((c) =>
    c && c.length >= 3 ? (c as [number, number, number]) : null
  )

  // Get auto-label if global segments are provided
  const label =
    globalSegments.length > 0
      ? getSegmentLabel(segment as Segment, globalSegments, 30)
      : null

  return (
    <ListItem
      onClick={onClick}
      active={isSelected}
    >
      <div className="flex items-center gap-2 min-h-[48px]">
        {/* LED range indicator */}
        <div className="flex flex-col items-center min-w-[40px]">
          <span className="text-xs font-mono text-muted-foreground">{start}</span>
          <div className="w-px h-2 bg-border" />
          <span className="text-xs font-mono text-muted-foreground">{stop}</span>
        </div>

        {/* Segment info */}
        <div className="flex-1 min-w-0">
          {label && (
            <div className="mb-0.5" title={label.tooltip}>
              <span className="text-xs font-semibold text-primary">
                {label.display}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <ColorSwatchRow colors={colors.slice(0, 3)} size="sm" />
            <span className="font-medium truncate text-sm">{effectName}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stop - start} LEDs
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {canMergeUp && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onMergeUp?.()
              }}
              title="Merge with segment above"
            >
              <Merge className="h-4 w-4" />
            </Button>
          )}
          {canSplit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onSplit?.()
              }}
              title="Split segment"
            >
              <Scissors className="h-4 w-4" />
            </Button>
          )}
          {canMergeDown && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onMergeDown?.()
              }}
              title="Merge with segment below"
            >
              <Merge className="h-4 w-4 rotate-180" />
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </ListItem>
  )
}
