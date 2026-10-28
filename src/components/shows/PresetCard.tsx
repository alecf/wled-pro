import { Check, Play, Trash2 } from 'lucide-react'
import { ListItem } from '@/components/common/List'
import { Button } from '@/components/ui/button'
import { showSwatchColors } from '@/lib/segmentPreview'
import type { ParsedPreset } from '@/types/wled'

interface PresetCardProps {
  preset: ParsedPreset
  isActive: boolean
  isLoading: boolean
  onActivate: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Preset segments, minus the {id, stop: 0} entries WLED stores for deleted segments */
function getPresetSegments(preset: ParsedPreset) {
  return (preset.seg ?? []).filter((seg) => seg.stop !== 0)
}

/**
 * Get a brief description of the preset
 */
function getPresetDescription(preset: ParsedPreset): string {
  const segCount = getPresetSegments(preset).length

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
  onDelete,
}: PresetCardProps) {
  const colors = showSwatchColors(getPresetSegments(preset))
  const description = getPresetDescription(preset)

  return (
    <ListItem active={isActive} className={isLoading ? 'opacity-70' : ''} onClick={onEdit}>
      <div className="flex items-center gap-3 min-h-[52px]">
        {/* Color swatches */}
        <div className="flex -space-x-1">
          {colors.length > 0 ? (
            colors.map((color, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-position swatches; the same color can repeat
                key={i}
                className="w-7 h-7 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))
          ) : (
            <div className="w-7 h-7 rounded-full border-2 border-background bg-muted" />
          )}
        </div>

        {/* Preset info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {preset.ql && <span className="text-sm">{preset.ql}</span>}
            <h3 className="font-medium truncate">{preset.n}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 text-muted-foreground"
          aria-label={`Delete ${preset.n}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          disabled={isLoading}
        >
          <Trash2 className="h-5 w-5" />
        </Button>

        {/* Play/Active indicator */}
        {isActive ? (
          <div className="w-12 h-12 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[var(--color-preset-active-ring)] flex items-center justify-center">
              <Check className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12"
            aria-label={`Play ${preset.n}`}
            onClick={(e) => {
              e.stopPropagation()
              onActivate()
            }}
            disabled={isLoading}
          >
            <Play className="h-6 w-6" />
          </Button>
        )}
      </div>
    </ListItem>
  )
}
