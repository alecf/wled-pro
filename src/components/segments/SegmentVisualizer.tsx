import { cn } from '@/lib/utils'
import type { GlobalSegment } from '@/types/segments'

interface SegmentVisualizerProps {
  segment: GlobalSegment
  ledCount: number
  /** CSS background for the segment's range (e.g. its colors); defaults to the theme color */
  fill?: string | null
}

export function SegmentVisualizer({ segment, ledCount, fill }: SegmentVisualizerProps) {
  // Calculate position as percentage
  const startPercent = ledCount > 0 ? (segment.start / ledCount) * 100 : 0
  const widthPercent = ledCount > 0 ? ((segment.stop - segment.start) / ledCount) * 100 : 100

  return (
    <div className="space-y-1">
      {/* LED strip visualization */}
      <div className="relative h-6 bg-muted rounded-sm overflow-hidden">
        {/* Full strip background */}
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted to-muted" />

        {/* Segment highlight */}
        <div
          className={cn(
            'absolute top-0 bottom-0 border-x-2 border-primary',
            !fill && 'bg-primary/30',
            'transition-all duration-200',
          )}
          style={{
            left: `${startPercent}%`,
            width: `${widthPercent}%`,
            background: fill ?? undefined,
          }}
        />

        {/* LED indicators (show every ~5% of total LEDs) */}
        {ledCount > 0 &&
          Array.from({ length: Math.min(20, ledCount) }).map((_, i) => {
            const ledIndex = Math.floor((i / 20) * ledCount)
            const ledPercent = (ledIndex / ledCount) * 100
            const isInSegment = ledIndex >= segment.start && ledIndex < segment.stop

            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed set of positional tick marks
                key={i}
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full',
                  isInSegment ? (fill ? 'bg-black/25' : 'bg-primary') : 'bg-muted-foreground/20',
                )}
                style={{ left: `${ledPercent}%` }}
              />
            )
          })}
      </div>

      {/* Position labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0</span>
        <span className="font-medium text-primary">
          {segment.start}–{segment.stop - 1}
        </span>
        <span>{ledCount}</span>
      </div>
    </div>
  )
}
