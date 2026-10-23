import { paletteGradient } from '@/lib/segmentPreview'
import { cn } from '@/lib/utils'
import type { PaletteDefinition } from '@/types/wled'

interface PaletteColorStripProps {
  colors: PaletteDefinition
  className?: string
  height?: number
}

/**
 * Displays a horizontal color strip for a palette.
 * Colors are shown as a continuous gradient.
 */
export function PaletteColorStrip({ colors, className = '', height = 12 }: PaletteColorStripProps) {
  if (!colors || colors.length === 0) {
    return <div className={cn('rounded-full bg-muted w-full', className)} style={{ height }} />
  }

  // Dynamic palettes ("c1", "r", ...) depend on the segment: show a generic placeholder
  const gradient = paletteGradient(colors)
  if (!gradient) {
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 w-full',
          className,
        )}
        style={{ height }}
      />
    )
  }

  return (
    <div
      className={cn('rounded-full w-full', className)}
      style={{ height, background: gradient }}
    />
  )
}
