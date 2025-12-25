import { ColorSwatchRow } from '@/components/common/ColorSwatch'
import { PaletteColorStrip } from '@/components/common/PaletteColorStrip'
import type { Effect } from '@/lib/effects'
import type { PaletteWithColors } from '@/types/wled'

interface SegmentEffectPreviewProps {
  /** The effect being used (if null, assumes Solid/no effect) */
  effect: Effect | null
  /** Effect name for display */
  effectName: string
  /** All color slots from the segment */
  colors: ([number, number, number] | null)[]
  /** Current palette ID */
  paletteId?: number
  /** Available palettes with color data */
  palettes?: PaletteWithColors[]
}

/**
 * Displays a smart preview of a segment's effect:
 * - Shows only the colors that the effect actually uses
 * - Shows palette preview if the effect uses a palette
 * - Hides colors if the effect doesn't use them
 */
export function SegmentEffectPreview({
  effect,
  effectName,
  colors,
  paletteId,
  palettes = [],
}: SegmentEffectPreviewProps) {
  // Determine which colors to show based on effect metadata
  const colorSlotsToShow = effect?.colors || []

  // Get only the colors that the effect uses
  const relevantColors = colorSlotsToShow.map((slot) => colors[slot.index] || null)

  // Find the palette if the effect uses one
  const usesPalette = effect?.usesPalette ?? false
  const currentPalette = usesPalette && paletteId !== undefined
    ? palettes.find((p) => p.id === paletteId)
    : null

  return (
    <div className="space-y-1.5">
      {/* Color swatches (only if effect uses colors) */}
      {relevantColors.length > 0 && (
        <div className="flex items-center gap-2">
          <ColorSwatchRow colors={relevantColors} size="sm" />
          <span className="text-sm text-muted-foreground truncate">
            {effectName}
          </span>
        </div>
      )}

      {/* Effect name (if no colors shown) */}
      {relevantColors.length === 0 && (
        <div className="text-sm text-muted-foreground truncate">
          {effectName}
        </div>
      )}

      {/* Palette preview */}
      {usesPalette && currentPalette && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground truncate">
            {currentPalette.name}
          </div>
          <PaletteColorStrip
            colors={currentPalette.colors}
            height={8}
          />
        </div>
      )}
    </div>
  )
}
