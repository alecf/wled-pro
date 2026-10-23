import { Plus } from 'lucide-react'
import { useState } from 'react'
import { List } from '@/components/common/List'
import { SegmentRow } from '@/components/common/SegmentRow'
import { MergeSegmentDialog } from '@/components/segments/MergeSegmentDialog'
import { Button } from '@/components/ui/button'
import type { Effect } from '@/lib/effects'
import { getSegmentLabel } from '@/lib/segmentLabeling'
import { segmentPreviewBackground } from '@/lib/segmentPreview'
import { segmentsToRangeItems } from '@/lib/segmentUtils'
import { cn } from '@/lib/utils'
import type { GlobalSegment } from '@/types/segments'
import type { PaletteWithColors, Segment } from '@/types/wled'
import { GapCard } from './GapCard'

interface SegmentListProps {
  segments: (Partial<Segment> & { id: number })[]
  effectNames: Map<number, string>
  effects?: Effect[]
  palettes?: PaletteWithColors[]
  globalSegments?: GlobalSegment[]
  maxLedCount: number
  onSelectSegment: (id: number) => void
  onSplitSegment: (id: number) => void
  onMergeSegments: (keepId: number, removeId: number) => void
  onMergeGapUp?: (gapStart: number, gapStop: number) => void
  onMergeGapDown?: (gapStart: number, gapStop: number) => void
  onConvertGapToSegment?: (gapStart: number, gapStop: number) => void
  onAddSegment?: () => void
}

export function SegmentList({
  segments,
  effectNames,
  effects = [],
  palettes = [],
  globalSegments,
  maxLedCount,
  onSelectSegment,
  onSplitSegment,
  onMergeSegments,
  onMergeGapUp,
  onMergeGapDown,
  onConvertGapToSegment,
  onAddSegment,
}: SegmentListProps) {
  // Merge dialog state
  const [mergeSegmentId, setMergeSegmentId] = useState<number | null>(null)

  const labelFor = (segment: Partial<Segment> & { id: number }, maxLength: number) =>
    getSegmentLabel(segment as Segment, globalSegments ?? [], maxLength).display

  // Convert segments to unified range items (segments + gaps)
  const rangeItems = segmentsToRangeItems(segments, maxLedCount)

  // Find adjacent segments for merge dialog
  const mergeSegment =
    mergeSegmentId !== null ? segments.find((s) => s.id === mergeSegmentId) : null
  const sortedSegments = [...segments].sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
  const mergeSegmentIndex = mergeSegment
    ? sortedSegments.findIndex((s) => s.id === mergeSegment.id)
    : -1
  const segmentAbove = mergeSegmentIndex > 0 ? sortedSegments[mergeSegmentIndex - 1] : null
  const segmentBelow =
    mergeSegmentIndex >= 0 && mergeSegmentIndex < sortedSegments.length - 1
      ? sortedSegments[mergeSegmentIndex + 1]
      : null

  // Check if segments are actually adjacent (no gaps)
  const canMergeUp = segmentAbove && mergeSegment && segmentAbove.stop === mergeSegment.start
  const canMergeDown = segmentBelow && mergeSegment && segmentBelow.start === mergeSegment.stop

  return (
    <div className="space-y-4">
      {/* LED strip preview: each segment drawn with its colors; tap one to edit it */}
      <div className="relative h-8 bg-muted rounded-md overflow-hidden">
        {segments.map((segment) => {
          const start = segment.start ?? 0
          const stop = segment.stop ?? maxLedCount
          const effect = effects.find((e) => e.id === (segment.fx ?? 0))
          const label = labelFor(segment, 50)
          return (
            <button
              type="button"
              key={segment.id}
              className={cn(
                'absolute inset-y-0 border-x border-background',
                'focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2',
                segment.on === false && 'opacity-30',
              )}
              style={{
                left: `${(start / maxLedCount) * 100}%`,
                width: `${((stop - start) / maxLedCount) * 100}%`,
                background: segmentPreviewBackground(segment, effect, palettes) ?? undefined,
              }}
              aria-label={`Edit ${label}`}
              title={`${label}: LEDs ${start}–${stop - 1}`}
              onClick={() => onSelectSegment(segment.id)}
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

            // Can merge with adjacent segments (no gaps)
            const canMergeUp =
              prevItem?.type === 'segment' && prevItem.segment.stop === segment.start
            const canMergeDown =
              nextItem?.type === 'segment' && nextItem.segment.start === segment.stop
            const canMerge = canMergeUp || canMergeDown

            // Can split if segment has more than 1 LED
            const segmentLength = (segment.stop ?? 0) - (segment.start ?? 0)
            const canSplit = segmentLength > 1

            // Get auto-label from global segments
            const autoLabel = getSegmentLabel(segment as Segment, globalSegments ?? [], 30)

            // Find the effect metadata
            const currentEffect = effects.find((e) => e.id === (segment.fx ?? 0))

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
                effect={currentEffect || null}
                effectName={effectNames.get(segment.fx ?? 0) ?? 'Solid'}
                colors={segment.col || []}
                paletteId={segment.pal}
                palettes={palettes}
                previewFill={segmentPreviewBackground(segment, currentEffect, palettes)}
                autoLabel={autoLabel}
                canSplit={canSplit}
                canMerge={canMerge}
                onClick={() => onSelectSegment(segment.id)}
                onSplit={() => onSplitSegment(segment.id)}
                onMerge={canMerge ? () => setMergeSegmentId(segment.id) : undefined}
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
                onMergeUp={canMergeUp ? () => onMergeGapUp?.(gap.start, gap.stop) : undefined}
                onMergeDown={canMergeDown ? () => onMergeGapDown?.(gap.start, gap.stop) : undefined}
                onConvertToSegment={() => onConvertGapToSegment?.(gap.start, gap.stop)}
              />
            )
          }
        })}
      </List>

      {/* Add segment button */}
      {onAddSegment && segments.length < 10 && (
        <Button variant="outline" className="w-full" onClick={onAddSegment}>
          <Plus className="h-4 w-4 mr-2" />
          Add Segment
        </Button>
      )}

      {/* Merge dialog */}
      <MergeSegmentDialog
        open={mergeSegmentId !== null}
        segmentAbove={
          canMergeUp && segmentAbove
            ? {
                name: labelFor(segmentAbove, 50),
              }
            : undefined
        }
        segmentBelow={
          canMergeDown && segmentBelow
            ? {
                name: labelFor(segmentBelow, 50),
              }
            : undefined
        }
        onMergeUp={
          canMergeUp && segmentAbove && mergeSegment
            ? () => {
                onMergeSegments(segmentAbove.id, mergeSegment.id)
                setMergeSegmentId(null)
              }
            : undefined
        }
        onMergeDown={
          canMergeDown && segmentBelow && mergeSegment
            ? () => {
                onMergeSegments(segmentBelow.id, mergeSegment.id)
                setMergeSegmentId(null)
              }
            : undefined
        }
        onClose={() => setMergeSegmentId(null)}
      />
    </div>
  )
}
