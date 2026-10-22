import { cn } from '@/lib/utils'

interface ColorSwatchProps {
  color: [number, number, number] | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

const sizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function ColorSwatch({ color, size = 'md', className, onClick }: ColorSwatchProps) {
  const backgroundColor = color ? `rgb(${color[0]}, ${color[1]}, ${color[2]})` : 'transparent'

  const classes = cn(
    'block rounded-full border-2 border-background shadow-sm',
    sizes[size],
    !color && 'bg-muted border-dashed',
    onClick && 'cursor-pointer hover:ring-2 hover:ring-primary/50',
    className,
  )

  if (onClick) {
    return (
      <button
        type="button"
        aria-label="Edit color"
        className={classes}
        style={{ backgroundColor }}
        onClick={onClick}
      />
    )
  }

  return <span className={classes} style={{ backgroundColor }} />
}

/**
 * Display multiple color swatches in a row
 */
interface ColorSwatchRowProps {
  colors: ([number, number, number] | null)[]
  size?: 'sm' | 'md' | 'lg'
  onColorClick?: (index: number) => void
}

export function ColorSwatchRow({ colors, size = 'md', onColorClick }: ColorSwatchRowProps) {
  return (
    <div className="flex -space-x-1">
      {colors.map((color, i) => (
        <ColorSwatch
          // biome-ignore lint/suspicious/noArrayIndexKey: colors are fixed slots (1-3)
          key={i}
          color={color}
          size={size}
          onClick={onColorClick ? () => onColorClick(i) : undefined}
        />
      ))}
    </div>
  )
}
