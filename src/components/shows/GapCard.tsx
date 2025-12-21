import { Button } from '@/components/ui/button'
import { ArrowUp, Plus, ArrowDown } from 'lucide-react'
import { ListItem } from '@/components/common'

interface GapCardProps {
  start: number
  stop: number
  canMergeUp?: boolean
  canMergeDown?: boolean
  onMergeUp?: () => void
  onMergeDown?: () => void
  onConvertToSegment?: () => void
}

export function GapCard({
  start,
  stop,
  canMergeUp = false,
  canMergeDown = false,
  onMergeUp,
  onMergeDown,
  onConvertToSegment,
}: GapCardProps) {
  return (
    <ListItem className="bg-muted/30 opacity-75 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-2 min-h-[48px]">
        {/* LED range indicator */}
        <div className="flex flex-col items-center min-w-[40px] opacity-50">
          <span className="text-xs font-mono text-muted-foreground">{start}</span>
          <div className="w-px h-2 bg-border" />
          <span className="text-xs font-mono text-muted-foreground">{stop}</span>
        </div>

        {/* Gap info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-dashed border-muted-foreground/40 rounded" />
            <span className="font-medium text-muted-foreground text-sm">Gap</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stop - start} unused LEDs
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
              title="Extend segment above to fill gap"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation()
              onConvertToSegment?.()
            }}
            title="Convert gap to new segment"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {canMergeDown && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation()
                onMergeDown?.()
              }}
              title="Extend segment below to fill gap"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </ListItem>
  )
}
