import { Check } from 'lucide-react'
import { hexToRgb, includesColor, rgbToHex, withWhiteOf } from '@/lib/color'
import { cn } from '@/lib/utils'
import type { RGB, SegmentColor } from '@/types/wled'

/** Quick picks: whites first (the most common LED colors), then a hue wheel */
const PRESET_COLORS: RGB[] = [
  [255, 255, 255],
  [255, 200, 120],
  [255, 160, 0],
  [255, 0, 0],
  [255, 0, 100],
  [200, 0, 255],
  [100, 0, 255],
  [0, 0, 255],
  [0, 140, 255],
  [0, 255, 255],
  [0, 255, 120],
  [0, 255, 0],
  [160, 255, 0],
  [255, 255, 0],
  [0, 0, 0],
]

interface ColorPickerProps {
  color: SegmentColor
  /** The picked color, keeping `color`'s white channel on RGBW strips */
  onChange: (color: SegmentColor) => void
}

/** Preset swatches plus the browser's color picker for anything else (RGB only) */
export function ColorPicker({ color, onChange }: ColorPickerProps) {
  const hex = rgbToHex(color)
  const isCustom = !includesColor(PRESET_COLORS, color)
  const pick = (rgb: RGB) => onChange(withWhiteOf(rgb, color))

  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {PRESET_COLORS.map((preset) => {
        const presetHex = rgbToHex(preset)
        const selected = includesColor([preset], color)
        return (
          <button
            key={presetHex}
            type="button"
            aria-label={`Color ${presetHex}`}
            aria-pressed={selected}
            onClick={() => pick(preset)}
            className={cn(
              'h-7 w-7 rounded-full border border-black/10 flex items-center justify-center',
              selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
            style={{ background: presetHex }}
          >
            {selected && <Check className="h-3.5 w-3.5 text-white mix-blend-difference" />}
          </button>
        )
      })}
      <label
        className={cn(
          'relative h-7 w-7 rounded-full border border-black/10 cursor-pointer overflow-hidden',
          'bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]',
          isCustom && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
        title="Custom color"
      >
        <input
          type="color"
          aria-label="Custom color"
          value={hex}
          onChange={(e) => {
            const rgb = hexToRgb(e.target.value)
            if (rgb) pick(rgb)
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
    </div>
  )
}
