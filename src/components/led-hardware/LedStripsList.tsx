import { ListSection } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { LedInstance } from '@/types/wled'
import { LedStripRow } from './LedStripRow'

interface LedStripsListProps {
  strips: LedInstance[]
  onAddStrip: () => void
  onEditStrip: (index: number) => void
  onDeleteStrip: (e: React.MouseEvent, index: number) => void
  getLedTypeName: (typeId: number) => string
  getColorOrderName: (orderId: number) => string
}

export function LedStripsList({
  strips,
  onAddStrip,
  onEditStrip,
  onDeleteStrip,
  getLedTypeName,
  getColorOrderName,
}: LedStripsListProps) {
  return (
    <ListSection title="LED Strips">
      {strips.length === 0 ? (
        <div className="px-4 py-8">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground text-sm">No LED strips configured</p>
            <Button onClick={onAddStrip} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Strip
            </Button>
          </div>
        </div>
      ) : (
        <>
          {strips.map((strip, idx) => (
            <LedStripRow
              key={idx}
              strip={strip}
              index={idx}
              onEdit={onEditStrip}
              onDelete={onDeleteStrip}
              getLedTypeName={getLedTypeName}
              getColorOrderName={getColorOrderName}
            />
          ))}
          <div className="px-4 py-3 border-t border-[var(--color-list-divider)] bg-[var(--color-list-item-bg)]">
            <Button onClick={onAddStrip} size="sm" variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Strip
            </Button>
          </div>
        </>
      )}
    </ListSection>
  )
}
