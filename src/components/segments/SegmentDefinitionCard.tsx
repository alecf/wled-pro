import { useState, useRef, useEffect } from 'react'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X, Split as SplitIcon, Merge, FolderTree } from 'lucide-react'
import { SegmentVisualizer } from './SegmentVisualizer'
import { SegmentActionDialog, type ActionMode } from './SegmentActionDialog'
import { cn } from '@/lib/utils'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'

interface SegmentDefinitionCardProps {
  segment: GlobalSegment
  ledCount: number
  isSelected: boolean
  onSelect: () => void
  segments?: GlobalSegment[]
  groups?: SegmentGroup[]
}

export function SegmentDefinitionCard({
  segment,
  ledCount,
  isSelected,
  onSelect,
  segments = [],
  groups = [],
}: SegmentDefinitionCardProps) {
  const { renameSegment } = useSegmentDefinitions(segment.controllerId)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(segment.name)
  const [actionMode, setActionMode] = useState<ActionMode | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    const trimmed = editedName.trim()
    if (trimmed && trimmed !== segment.name) {
      renameSegment(segment.id, trimmed)
    }
    setIsEditing(false)
    setEditedName(segment.name)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedName(segment.name)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <Card
      className={cn(
        'p-3 space-y-2 transition-colors cursor-pointer',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      {/* Segment header with inline rename */}
      <div className="flex items-center justify-between gap-2">
        {isEditing ? (
          <>
            <Input
              ref={inputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSave()
                }}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancel()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{segment.name}</h4>
              <p className="text-xs text-muted-foreground">
                LEDs {segment.start}–{segment.stop - 1} ({segment.stop - segment.start} LEDs)
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Visual representation */}
      <SegmentVisualizer segment={segment} ledCount={ledCount} />

      {/* Action buttons (shown when selected) */}
      {isSelected && !isEditing && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setActionMode('split')
            }}
          >
            <SplitIcon className="h-4 w-4 mr-2" />
            Split
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setActionMode('merge')
            }}
          >
            <Merge className="h-4 w-4 mr-2" />
            Merge
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              setActionMode('assign-group')
            }}
          >
            <FolderTree className="h-4 w-4 mr-2" />
            Group
          </Button>
        </div>
      )}

      {/* Action dialog */}
      <SegmentActionDialog
        mode={actionMode}
        segment={segment}
        segments={segments}
        groups={groups}
        controllerId={segment.controllerId}
        ledCount={ledCount}
        onClose={() => setActionMode(null)}
      />
    </Card>
  )
}
