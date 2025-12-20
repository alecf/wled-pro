import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { ColorSwatch } from '@/components/common'
import { EffectParameterControls } from '@/components/effects/EffectParameterControls'
import { EffectFlagBadges } from '@/components/common'
import { CirclePicker } from 'react-color'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Segment } from '@/types/wled'
import type { Effect } from '@/lib/effects'
import { cn } from '@/lib/utils'

interface SegmentEditorProps {
  segment: Segment
  effects: Effect[]
  palettes: string[]
  onUpdate: (updates: Partial<Segment>) => void
}

export function SegmentEditor({
  segment,
  effects,
  palettes,
  onUpdate,
}: SegmentEditorProps) {
  const [effectPickerOpen, setEffectPickerOpen] = useState(false)
  const [palettePickerOpen, setPalettePickerOpen] = useState(false)
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null)

  const currentEffect = effects.find((e) => e.id === segment.fx)
  const colors = segment.col || [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

  // Get color labels from effect metadata
  const colorLabels = currentEffect?.colors.map((c) => c.name) ?? ['Primary', 'Secondary', 'Tertiary']

  const handleColorChange = (index: number, color: { rgb: { r: number; g: number; b: number } }) => {
    const newColors = [...colors]
    newColors[index] = [color.rgb.r, color.rgb.g, color.rgb.b]
    onUpdate({ col: newColors as [number, number, number][] })
  }

  return (
    <div className="space-y-3">
      {/* Effect Selection */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Effect</Label>
          <Button
            variant="outline"
            className="w-full justify-between h-9"
            onClick={() => setEffectPickerOpen(!effectPickerOpen)}
          >
            <span className="flex items-center gap-2">
              <span className="text-sm">{currentEffect?.name ?? 'Select Effect'}</span>
              {currentEffect && <EffectFlagBadges flags={currentEffect.flags} />}
            </span>
            {effectPickerOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {effectPickerOpen && (
            <div className="max-h-48 overflow-auto border rounded-md">
              {effects.map((effect) => (
                <button
                  key={effect.id}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between',
                    effect.id === segment.fx && 'bg-primary/10'
                  )}
                  onClick={() => {
                    onUpdate({ fx: effect.id })
                    setEffectPickerOpen(false)
                  }}
                >
                  <span>{effect.name}</span>
                  <EffectFlagBadges flags={effect.flags} />
                </button>
              ))}
            </div>
          )}

          {/* Effect parameters */}
          {currentEffect && currentEffect.parameters.length > 0 && (
            <div className="pt-2 border-t">
              <EffectParameterControls
                effect={currentEffect}
                values={{
                  sx: segment.sx,
                  ix: segment.ix,
                  c1: segment.c1,
                  c2: segment.c2,
                  c3: segment.c3,
                  o1: false,
                  o2: false,
                  o3: false,
                }}
                onChange={(key, value) => {
                  onUpdate({ [key]: value } as Partial<Segment>)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Colors & Palette */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colors</Label>

          {/* Color swatches row */}
          <div className="flex gap-2">
            {colors.slice(0, 3).map((color, i) => (
              <button
                key={i}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 p-2 rounded-md border transition-colors',
                  activeColorIndex === i ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted'
                )}
                onClick={() => setActiveColorIndex(activeColorIndex === i ? null : i)}
              >
                <ColorSwatch color={color as [number, number, number]} size="md" />
                <span className="text-[10px] text-muted-foreground">{colorLabels[i]}</span>
              </button>
            ))}
          </div>

          {/* Color picker for active color */}
          {activeColorIndex !== null && (
            <div className="pt-2 flex justify-center">
              <CirclePicker
                color={{ r: colors[activeColorIndex][0], g: colors[activeColorIndex][1], b: colors[activeColorIndex][2] }}
                onChange={(color) => handleColorChange(activeColorIndex, color)}
                circleSize={28}
                circleSpacing={10}
              />
            </div>
          )}

          {/* Palette picker */}
          {currentEffect?.usesPalette && (
            <>
              <div className="pt-2 border-t">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Palette</Label>
              </div>
              <Button
                variant="outline"
                className="w-full justify-between h-9"
                onClick={() => setPalettePickerOpen(!palettePickerOpen)}
              >
                <span className="text-sm">{palettes[segment.pal] ?? `Palette ${segment.pal}`}</span>
                {palettePickerOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {palettePickerOpen && (
                <div className="max-h-48 overflow-auto border rounded-md">
                  {palettes.map((name, id) => (
                    <button
                      key={id}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-muted',
                        id === segment.pal && 'bg-primary/10'
                      )}
                      onClick={() => {
                        onUpdate({ pal: id })
                        setPalettePickerOpen(false)
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Brightness */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brightness</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round((segment.bri / 255) * 100)}%
            </span>
          </div>
          <Slider
            value={[segment.bri]}
            min={0}
            max={255}
            step={1}
            onValueChange={([value]) => onUpdate({ bri: value })}
          />
        </CardContent>
      </Card>

      {/* LED Range - compact at bottom */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
        <span>LEDs:</span>
        <Input
          type="number"
          value={segment.start}
          onChange={(e) => onUpdate({ start: parseInt(e.target.value, 10) })}
          className="h-7 w-16 text-xs"
        />
        <span>–</span>
        <Input
          type="number"
          value={segment.stop}
          onChange={(e) => onUpdate({ stop: parseInt(e.target.value, 10) })}
          className="h-7 w-16 text-xs"
        />
        <span className="text-xs">({segment.stop - segment.start})</span>
      </div>
    </div>
  )
}
