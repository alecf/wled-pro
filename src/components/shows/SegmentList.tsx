import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { GapCard } from './GapCard'
import { List, SegmentRow } from '@/components/common'
import { segmentsToRangeItems } from '@/lib/segmentUtils'
import { getSegmentLabel } from '@/lib/segmentLabeling'
import type { Segment } from '@/types/wled'
import type { GlobalSegment } from '@/types/segments'

interface SegmentListProps {
  segments: (Partial<Segment> & { id: number })[]
  effectNames: Map<number, string>
  globalSegments?: GlobalSegment[]
  maxLedCount: number
  onSelectSegment: (id: number) => void
  onSplitSegment: (id: number) => void
  onMergeGapUp?: (gapStart: number, gapStop: number) => void
  onMergeGapDown?: (gapStart: number, gapStop: number) => void
  onConvertGapToSegment?: (gapStart: number, gapStop: number) => void
  onAddSegment?: () => void
}

export function SegmentList({
  segments,
  effectNames,
  globalSegments,
  maxLedCount,
  onSelectSegment,
  onSplitSegment,
  onMergeGapUp,
  onMergeGapDown,
  onConvertGapToSegment,
  onAddSegment,
}: SegmentListProps) {
  // Convert segments to unified range items (segments + gaps)
  const rangeItems = segmentsToRangeItems(segments, maxLedCount)

  return (
    <div className="space-y-4">
      {/* LED strip visualization */}
      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
        {segments.map((segment, index) => {
          const start = segment.start ?? 0
          const stop = segment.stop ?? maxLedCount
          const left = (start / maxLedCount) * 100
          const width = ((stop - start) / maxLedCount) * 100

          // Get first color from segment
          const firstColor = segment.col?.[0]
          const bgColor = firstColor
            ? `rgb(${firstColor[0]}, ${firstColor[1]}, ${firstColor[2]})`
            : `hsl(${(index * 60) % 360}, 70%, 50%)`

          return (
            <div
              key={segment.id}
              className="absolute top-0 bottom-0 border-r border-background last:border-r-0"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: bgColor,
              }}
              title={`Segment ${segment.id + 1}: ${start}-${stop - 1}`}
            />
          )
        })}
      </div>

      {/* Segment and gap list */}
      <List>
        {rangeItems.map((item, index) => {
          const prevItem = index > 0 ? rangeItems[index - 1] : null
          const nextItem = index < rangeItems.length - 1 ? rangeItems[index + 1] : null

          if (item.type === 'segment') {
            const segment = item.segment

            // Can split if segment has more than 1 LED
            const segmentLength = (segment.stop ?? 0) - (segment.start ?? 0)
            const canSplit = segmentLength > 1

            // Get auto-label from global segments
            const autoLabel = globalSegments
              ? getSegmentLabel(segment as Segment, globalSegments, 30)
              : null

            return (
              <SegmentRow
                key={`segment-${segment.id}`}
                segment={{
                  id: segment.id,
                  start: segment.start ?? 0,
                  stop: segment.stop ?? maxLedCount,
                }}
                ledCount={maxLedCount}
                showEffectInfo
                effectName={effectNames.get(segment.fx ?? 0) ?? 'Solid'}
                colors={segment.col || []}
                autoLabel={autoLabel || undefined}
                canSplit={canSplit}
                canMerge={false}
                onClick={() => onSelectSegment(segment.id)}
                onSplit={() => onSplitSegment(segment.id)}
              />
            )
          } else {
            // Gap item
            const gap = item

            // Can merge if adjacent items are segments
            const canMergeUp = prevItem?.type === 'segment'
            const canMergeDown = nextItem?.type === 'segment'

            return (
              <GapCard
                key={`gap-${gap.start}-${gap.stop}`}
                start={gap.start}
                stop={gap.stop}
                canMergeUp={canMergeUp}
                canMergeDown={canMergeDown}
                onMergeUp={
                  canMergeUp ? () => onMergeGapUp?.(gap.start, gap.stop) : undefined
                }
                onMergeDown={
                  canMergeDown ? () => onMergeGapDown?.(gap.start, gap.stop) : undefined
                }
                onConvertToSegment={() => onConvertGapToSegment?.(gap.start, gap.stop)}
              />
            )
          }
        })}
      </List>

      {/* Add segment button */}
      {onAddSegment && segments.length < 10 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onAddSegment}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Segment
        </Button>
      )}
    </div>
  )
}
