import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronRight, Scissors, Merge } from 'lucide-react'
import { ColorSwatchRow } from '@/components/common'
import type { Segment } from '@/types/wled'
import { cn } from '@/lib/utils'

interface SegmentCardProps {
  segment: Partial<Segment> & { id: number }
  effectName?: string
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

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-2">
        <div className="flex items-center gap-2">
          {/* LED range indicator */}
          <div className="flex flex-col items-center min-w-[40px]">
            <span className="text-xs font-mono text-muted-foreground">{start}</span>
            <div className="w-px h-2 bg-border" />
            <span className="text-xs font-mono text-muted-foreground">{stop}</span>
          </div>

          {/* Segment info */}
          <div className="flex-1 min-w-0">
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
                className="h-7 w-7"
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
                className="h-7 w-7"
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
                className="h-7 w-7"
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
      </CardContent>
    </Card>
  )
}
