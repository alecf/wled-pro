import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SegmentCard } from './SegmentCard'
import type { Segment } from '@/types/wled'

interface SegmentListProps {
  segments: (Partial<Segment> & { id: number })[]
  effectNames: Map<number, string>
  selectedSegmentId?: number
  maxLedCount: number
  onSelectSegment: (id: number) => void
  onSplitSegment: (id: number) => void
  onMergeSegments: (keepId: number, removeId: number) => void
  onAddSegment?: () => void
}

export function SegmentList({
  segments,
  effectNames,
  selectedSegmentId,
  maxLedCount,
  onSelectSegment,
  onSplitSegment,
  onMergeSegments,
  onAddSegment,
}: SegmentListProps) {
  // Sort segments by start position
  const sortedSegments = [...segments].sort(
    (a, b) => (a.start ?? 0) - (b.start ?? 0)
  )

  return (
    <div className="space-y-4">
      {/* LED strip visualization */}
      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
        {sortedSegments.map((segment, index) => {
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
              title={`Segment ${segment.id}: ${start}-${stop}`}
            />
          )
        })}
      </div>

      {/* Segment list */}
      <div className="space-y-2">
        {sortedSegments.map((segment, index) => {
          const prevSegment = index > 0 ? sortedSegments[index - 1] : null
          const nextSegment =
            index < sortedSegments.length - 1 ? sortedSegments[index + 1] : null

          // Can merge if adjacent segment exists
          const canMergeUp =
            prevSegment !== null &&
            (prevSegment.stop ?? 0) === (segment.start ?? 0)
          const canMergeDown =
            nextSegment !== null &&
            (segment.stop ?? 0) === (nextSegment.start ?? 0)

          // Can split if segment has more than 1 LED
          const segmentLength = (segment.stop ?? 0) - (segment.start ?? 0)
          const canSplit = segmentLength > 1

          return (
            <SegmentCard
              key={segment.id}
              segment={segment}
              effectName={effectNames.get(segment.fx ?? 0) ?? 'Solid'}
              isSelected={segment.id === selectedSegmentId}
              canSplit={canSplit}
              canMergeUp={canMergeUp}
              canMergeDown={canMergeDown}
              onClick={() => onSelectSegment(segment.id)}
              onSplit={() => onSplitSegment(segment.id)}
              onMergeUp={
                canMergeUp && prevSegment
                  ? () => onMergeSegments(prevSegment.id, segment.id)
                  : undefined
              }
              onMergeDown={
                canMergeDown && nextSegment
                  ? () => onMergeSegments(segment.id, nextSegment.id)
                  : undefined
              }
            />
          )
        })}
      </div>

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
