import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, SquareSplitHorizontal, SquaresUnite, FolderTree } from 'lucide-react'
import { ListItem, SegmentEffectPreview } from '@/components/common'
import { SegmentVisualizer } from '@/components/segments/SegmentVisualizer'
import type { GlobalSegment } from '@/types/segments'
import type { Effect } from '@/lib/effects'
import type { PaletteWithColors } from '@/types/wled'

interface SegmentRowProps {
  // Segment data (flexible to support both WLED segments and GlobalSegments)
  segment: {
    id: string | number
    start: number
    stop: number
    name?: string
  }

  // Display context
  ledCount: number
  isSelected?: boolean

  // Effect info (light show contexts only)
  showEffectInfo?: boolean
  effect?: Effect | null
  effectName?: string
  colors?: ([number, number, number] | null)[]
  paletteId?: number
  palettes?: PaletteWithColors[]

  // Auto-labeling (light show contexts only)
  autoLabel?: { display: string; tooltip?: string }

  // Name editing (global segments only)
  allowNameEditing?: boolean
  onNameChange?: (newName: string) => void

  // Actions availability
  canSplit?: boolean
  canMerge?: boolean
  showGroupButton?: boolean

  // Callbacks
  onClick?: () => void
  onSplit?: () => void
  onMerge?: () => void
  onGroup?: () => void
}

export function SegmentRow({
  segment,
  ledCount,
  isSelected = false,
  showEffectInfo = false,
  effect,
  effectName,
  colors = [],
  paletteId,
  palettes = [],
  autoLabel,
  allowNameEditing = false,
  onNameChange,
  canSplit = true,
  canMerge = false,
  showGroupButton = false,
  onClick,
  onSplit,
  onMerge,
  onGroup,
}: SegmentRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(segment.name || '')
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
      onNameChange?.(trimmed)
    }
    setIsEditing(false)
    setEditedName(segment.name || '')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedName(segment.name || '')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  // Determine display name
  const displayName = autoLabel
    ? autoLabel.display
    : segment.name || 'Unnamed Segment'

  const ledRange = `${segment.start}–${segment.stop - 1} (${segment.stop - segment.start} LED${segment.stop - segment.start !== 1 ? 's' : ''})`

  return (
    <ListItem
      onClick={onClick}
      active={isSelected}
    >
      <div className="space-y-2 w-full py-1">
        {/* Header: Name/LED Range + Action Buttons */}
        <div className="flex items-start justify-between gap-2">
          {allowNameEditing && isEditing ? (
            <>
              <Input
                ref={inputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className="h-8 text-sm flex-1"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-1 flex-shrink-0">
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
                <div
                  className="font-semibold text-sm truncate"
                  title={autoLabel?.tooltip || displayName}
                >
                  {displayName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ledRange}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {/* Edit button - leftmost when visible */}
                {allowNameEditing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }}
                    title="Edit name"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}

                {/* Group button */}
                {showGroupButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onGroup?.()
                    }}
                    title="Assign to group"
                  >
                    <FolderTree className="h-4 w-4" />
                  </Button>
                )}

                {/* Merge */}
                {canMerge ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMerge?.()
                    }}
                    title="Merge segment"
                  >
                    <SquaresUnite className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-8 w-8" />
                )}

                {/* Split */}
                {canSplit ? (
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
                    <SquareSplitHorizontal className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-8 w-8" />
                )}
              </div>
            </>
          )}
        </div>

        {/* Visualization Strip */}
        <SegmentVisualizer
          segment={segment as GlobalSegment}
          ledCount={ledCount}
        />

        {/* Effect Info (light show contexts only) */}
        {showEffectInfo && (
          <SegmentEffectPreview
            effect={effect || null}
            effectName={effectName || 'Unknown'}
            colors={colors}
            paletteId={paletteId}
            palettes={palettes}
          />
        )}
      </div>
    </ListItem>
  )
}
