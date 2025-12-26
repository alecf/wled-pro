import { ListItem } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { LedInstance } from '@/types/wled'

interface LedStripRowProps {
  strip: LedInstance
  index: number
  onEdit: (index: number) => void
  onDelete: (e: React.MouseEvent, index: number) => void
  getLedTypeName: (typeId: number) => string
  getColorOrderName: (orderId: number) => string
}

export function LedStripRow({
  strip,
  index,
  onEdit,
  onDelete,
  getLedTypeName,
  getColorOrderName,
}: LedStripRowProps) {
  return (
    <ListItem onClick={() => onEdit(index)}>
      <div className="flex items-center justify-between min-h-[48px]">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Strip {index + 1}</span>
            <span className="text-xs text-muted-foreground font-mono">
              GPIO {strip.pin.join(', ')}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {getLedTypeName(strip.type)} • {getColorOrderName(strip.order)} • LEDs{' '}
            {strip.start}-{strip.start + strip.len - 1} ({strip.len})
            {(strip.rev || strip.ref || strip.skip > 0) && (
              <>
                {strip.rev && ' • Reversed'}
                {strip.ref && ' • Mirrored'}
                {strip.skip > 0 && ` • Skip ${strip.skip}`}
              </>
            )}
          </div>
        </div>
        <Button onClick={(e) => onDelete(e, index)} size="sm" variant="ghost">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </ListItem>
  )
}
