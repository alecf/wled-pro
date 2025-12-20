import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, MoreVertical, Check } from 'lucide-react'
import type { ParsedPreset } from '@/types/wled'
import { cn } from '@/lib/utils'

interface PresetCardProps {
  preset: ParsedPreset
  isActive: boolean
  isLoading: boolean
  onActivate: () => void
  onEdit: () => void
  onDelete: () => void
}

/**
 * Extract color swatches from preset segments
 */
function getPresetColors(preset: ParsedPreset): string[] {
  const colors: string[] = []
  const segments = preset.seg || []

  for (const seg of segments) {
    if (seg.col) {
      for (const color of seg.col) {
        if (color && color.length >= 3) {
          const [r, g, b] = color
          // Skip black colors
          if (r === 0 && g === 0 && b === 0) continue
          colors.push(`rgb(${r}, ${g}, ${b})`)
          if (colors.length >= 3) break
        }
      }
    }
    if (colors.length >= 3) break
  }

  return colors
}

/**
 * Get a brief description of the preset
 */
function getPresetDescription(preset: ParsedPreset): string {
  const segments = preset.seg || []
  const segCount = segments.length

  if (segCount === 0) return 'No segments'
  if (segCount === 1) return '1 segment'
  return `${segCount} segments`
}

export function PresetCard({
  preset,
  isActive,
  isLoading,
  onActivate,
  onEdit,
  onDelete: _onDelete,
}: PresetCardProps) {
  // TODO: Add delete functionality via context menu or swipe
  void _onDelete
  const colors = getPresetColors(preset)
  const description = getPresetDescription(preset)

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all',
        isActive && 'ring-2 ring-primary',
        isLoading && 'opacity-70'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Color swatches */}
          <div className="flex -space-x-1">
            {colors.length > 0 ? (
              colors.map((color, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-background bg-muted" />
            )}
          </div>

          {/* Preset info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {preset.ql && (
                <span className="text-sm">{preset.ql}</span>
              )}
              <h3 className="font-medium truncate">{preset.n}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isActive ? (
              <div className="w-9 h-9 flex items-center justify-center text-primary">
                <Check className="h-5 w-5" />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={(e) => {
                  e.stopPropagation()
                  onActivate()
                }}
                disabled={isLoading}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
