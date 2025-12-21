import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { ColorSwatch, EffectFlagBadges } from '@/components/common'
import { EffectParameterControls } from '@/components/effects/EffectParameterControls'
import { CirclePicker } from 'react-color'
import { cn } from '@/lib/utils'
import type { Segment } from '@/types/wled'
import type { Effect } from '@/lib/effects'

interface SegmentEditorScreenProps {
  segment: Segment
  segmentIndex: number
  effects: Effect[]
  palettes: string[]
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
  const [effectPickerOpen, setEffectPickerOpen] = useState(false)
  const [palettePickerOpen, setPalettePickerOpen] = useState(false)
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null)

  const currentEffect = effects.find((e) => e.id === segment.fx)
  const colors = segment.col || [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

  const colorLabels = currentEffect?.colors.map((c) => c.name) ?? ['Primary', 'Secondary', 'Tertiary']

  const handleColorChange = (index: number, color: { rgb: { r: number; g: number; b: number } }) => {
    const newColors = [...colors]
    newColors[index] = [color.rgb.r, color.rgb.g, color.rgb.b]
    onUpdate({ col: newColors as [number, number, number][] })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        title={`Segment ${segmentIndex + 1}`}
        subtitle={`LEDs ${segment.start}–${segment.stop}`}
        onBack={onBack}
      />

      <ScreenContainer className="p-4 space-y-6">
        {/* Effect Selection */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Effect</Label>
          <Button
            variant="outline"
            className="w-full justify-between h-10"
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
            <div className="max-h-48 overflow-auto border rounded-md bg-background">
              {effects.map((effect) => (
                <button
                  key={effect.id}
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between border-b last:border-b-0',
                    effect.id === segment.fx && 'bg-[var(--color-list-item-bg-active)]'
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
        <div className="space-y-3">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colors</Label>

          <div className="flex gap-2">
            {colors.slice(0, 3).map((color, i) => (
              <button
                key={i}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 p-2 rounded-md transition-colors',
                  activeColorIndex === i ? 'bg-[var(--color-list-item-bg-active)]' : 'bg-muted/50 hover:bg-muted'
                )}
                onClick={() => setActiveColorIndex(activeColorIndex === i ? null : i)}
              >
                <ColorSwatch color={color as [number, number, number]} size="md" />
                <span className="text-[10px] text-muted-foreground">{colorLabels[i]}</span>
              </button>
            ))}
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

          {currentEffect?.usesPalette && (
            <>
              <div className="pt-4">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Palette</Label>
              </div>
              <Button
                variant="outline"
                className="w-full justify-between h-10"
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
                <div className="max-h-48 overflow-auto border rounded-md bg-background">
                  {palettes.map((name, id) => (
                    <button
                      key={id}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-muted border-b last:border-b-0',
                        id === segment.pal && 'bg-[var(--color-list-item-bg-active)]'
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
        </div>

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
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              value={segment.stop}
              onChange={(e) => onUpdate({ stop: parseInt(e.target.value, 10) })}
              className="h-10 flex-1"
            />
            <span className="text-xs text-muted-foreground">({segment.stop - segment.start})</span>
          </div>
        </div>
      </ScreenContainer>
    </div>
  )
}

interface HeaderProps {
  title: string
  subtitle: string
  onBack: () => void
}

function Header({ title, subtitle, onBack }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center h-14 px-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="ml-2">
          <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </header>
  )
}
