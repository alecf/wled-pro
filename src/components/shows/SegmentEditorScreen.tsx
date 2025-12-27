import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { PageHeader } from '@/components/common/PageHeader'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Palette, Circle } from 'lucide-react'
import { ColorSwatch } from '@/components/common/ColorSwatch'
import { EffectFlagBadges } from '@/components/common/FlagBadge'
import { PaletteColorStrip } from '@/components/common/PaletteColorStrip'
import { EffectParameterControls } from '@/components/effects/EffectParameterControls'
import { CirclePicker } from 'react-color'
import { cn } from '@/lib/utils'
import type { Segment } from '@/types/wled'
import type { Effect } from '@/lib/effects'
import type { PaletteWithColors } from '@/types/wled'

interface SegmentEditorScreenProps {
  segment: Segment
  segmentIndex: number
  effects: Effect[]
  palettes: PaletteWithColors[]
  onUpdate: (updates: Partial<Segment>) => void
  onBack: () => void
}

export function SegmentEditorScreen({
  segment,
  segmentIndex,
  effects,
  palettes,
  onUpdate,
  onBack,
}: SegmentEditorScreenProps) {
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null)

  const currentEffect = effects.find((e) => e.id === segment.fx)
  const colors = segment.col || [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

  const handleColorChange = (index: number, color: { rgb: { r: number; g: number; b: number } }) => {
    const newColors = [...colors]
    newColors[index] = [color.rgb.r, color.rgb.g, color.rgb.b]
    onUpdate({ col: newColors as [number, number, number][] })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader
        title={`Segment ${segmentIndex + 1}`}
        subtitle={`LEDs ${segment.start}–${segment.stop - 1}`}
        onBack={onBack}
      />

      <ScreenContainer className="p-4 space-y-6">
        {/* Effect Selection */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Effect</Label>
          <Select
            value={segment.fx.toString()}
            onValueChange={(value) => onUpdate({ fx: parseInt(value, 10) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {currentEffect && (
                  <span className="flex items-center gap-2">
                    <span>{currentEffect.name}</span>
                    <EffectFlagBadges flags={currentEffect.flags} />
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" className="max-w-none w-[var(--radix-select-trigger-width)]">
              {effects.map((effect) => (
                <SelectItem
                  key={effect.id}
                  value={effect.id.toString()}
                  className="w-full [&>span:last-child]:w-full [&>span:last-child]:flex [&>span:last-child]:gap-2 [&>span:last-child]:items-center"
                >
                  <span className="flex-1 truncate">{effect.name}</span>
                  <EffectCapabilityIcons effect={effect} />
                  <EffectFlagBadges flags={effect.flags} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentEffect && currentEffect.parameters.length > 0 && (
            <div className="pt-3 space-y-3">
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
        </div>

        {/* Colors & Palette */}
        {currentEffect && currentEffect.colors.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colors</Label>

            <div className="flex gap-2">
              {currentEffect.colors.map((colorSlot) => {
                const i = colorSlot.index
                return (
                  <button
                    key={i}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 p-2 rounded-md transition-colors',
                      activeColorIndex === i ? 'bg-[var(--color-list-item-bg-active)]' : 'bg-muted/50 hover:bg-muted'
                    )}
                    onClick={() => setActiveColorIndex(activeColorIndex === i ? null : i)}
                  >
                    <ColorSwatch color={colors[i] as [number, number, number]} size="md" />
                    <span className="text-[10px] text-muted-foreground">{colorSlot.name}</span>
                  </button>
                )
              })}
            </div>

            {activeColorIndex !== null && (
              <div className="flex justify-center pt-2">
                <CirclePicker
                  color={{ r: colors[activeColorIndex][0], g: colors[activeColorIndex][1], b: colors[activeColorIndex][2] }}
                  onChange={(color) => handleColorChange(activeColorIndex, color)}
                  circleSize={28}
                  circleSpacing={10}
                />
              </div>
            )}
          </div>
        )}

        {/* Palette */}
        {currentEffect?.usesPalette && (
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Palette</Label>
            <Select
              value={segment.pal.toString()}
              onValueChange={(value) => onUpdate({ pal: parseInt(value, 10) })}
            >
              <SelectTrigger
                className="w-full [&_*[data-slot=select-value]]:!w-full [&_*[data-slot=select-value]]:!items-start"
                style={{ height: 'auto', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
              >
                <SelectValue>
                  <div className="flex flex-col gap-1.5 w-full items-start">
                    <span className="text-left w-full">
                      {palettes.find((p) => p.id === segment.pal)?.name}
                    </span>
                    <PaletteColorStrip
                      colors={palettes.find((p) => p.id === segment.pal)?.colors || []}
                    />
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                {palettes.map((palette) => (
                  <SelectItem
                    key={palette.id}
                    value={palette.id.toString()}
                    className="[&>span:last-child]:w-full"
                  >
                    <div className="flex flex-col gap-1.5 w-full min-w-0">
                      <span className="truncate">{palette.name}</span>
                      <PaletteColorStrip colors={palette.colors} />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Brightness */}
        <div className="space-y-2">
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
        </div>

        {/* LED Range */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">LED Range</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={segment.start}
              onChange={(e) => onUpdate({ start: parseInt(e.target.value, 10) })}
              className="h-10 flex-1"
              placeholder="Start"
              aria-label="Start LED"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              value={segment.stop - 1}
              onChange={(e) => {
                const inclusiveEnd = parseInt(e.target.value, 10)
                if (!isNaN(inclusiveEnd)) {
                  onUpdate({ stop: inclusiveEnd + 1 })
                }
              }}
              className="h-10 flex-1"
              placeholder="End"
              aria-label="End LED"
            />
            <span className="text-xs text-muted-foreground">
              {segment.stop - segment.start} LED{segment.stop - segment.start !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </ScreenContainer>
    </div>
  )
}


interface EffectCapabilityIconsProps {
  effect: Effect
}

function EffectCapabilityIcons({ effect }: EffectCapabilityIconsProps) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {/* Color count */}
      {effect.colors.length > 0 && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: effect.colors.length }).map((_, i) => (
            <Circle key={i} className="h-2.5 w-2.5 fill-current" />
          ))}
        </div>
      )}

      {/* Palette support */}
      {effect.usesPalette && (
        <Palette className="h-3.5 w-3.5" />
      )}
    </div>
  )
}
