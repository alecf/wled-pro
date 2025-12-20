import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { ColorSwatch } from '@/components/common'
import { EffectParameterControls } from '@/components/effects/EffectParameterControls'
import { EffectFlagBadges } from '@/components/common'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { Segment } from '@/types/wled'
import type { Effect } from '@/lib/effects'
import { cn } from '@/lib/utils'

interface SegmentEditorProps {
  segment: Segment
  effects: Effect[]
  onUpdate: (updates: Partial<Segment>) => void
}

export function SegmentEditor({
  segment,
  effects,
  onUpdate,
}: SegmentEditorProps) {
  const [effectPickerOpen, setEffectPickerOpen] = useState(false)

  const currentEffect = effects.find((e) => e.id === segment.fx)
  const colors = segment.col || [[0, 0, 0], [0, 0, 0], [0, 0, 0]]

  // Get color labels from effect metadata
  const colorLabels = currentEffect?.colors.map((c) => c.name) ?? ['Primary', 'Secondary', 'Accent']

  return (
    <div className="space-y-4">
      {/* LED Range */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">LED Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seg-start">Start</Label>
              <Input
                id="seg-start"
                type="number"
                value={segment.start}
                onChange={(e) => onUpdate({ start: parseInt(e.target.value, 10) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seg-stop">End</Label>
              <Input
                id="seg-stop"
                type="number"
                value={segment.stop}
                onChange={(e) => onUpdate({ stop: parseInt(e.target.value, 10) })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {segment.stop - segment.start} LEDs
          </p>
        </CardContent>
      </Card>

      {/* Effect Selection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Effect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setEffectPickerOpen(!effectPickerOpen)}
          >
            <span className="flex items-center gap-2">
              <span>{currentEffect?.name ?? 'Select Effect'}</span>
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
          {currentEffect && (
            <EffectParameterControls
              effect={currentEffect}
              values={{
                sx: segment.sx,
                ix: segment.ix,
                c1: segment.c1,
                c2: segment.c2,
                c3: segment.c3,
                o1: false, // These aren't on Segment type yet
                o2: false,
                o3: false,
              }}
              onChange={(key, value) => {
                onUpdate({ [key]: value } as Partial<Segment>)
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {colors.slice(0, 3).map((color, i) => (
            <ColorEditor
              key={i}
              label={colorLabels[i] ?? `Color ${i + 1}`}
              color={color as [number, number, number]}
              onChange={(newColor) => {
                const newColors = [...colors]
                newColors[i] = newColor
                onUpdate({ col: newColors as [number, number, number][] })
              }}
            />
          ))}
        </CardContent>
      </Card>

      {/* Palette */}
      {currentEffect?.usesPalette && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Palette ID</Label>
                <span className="text-sm text-muted-foreground">{segment.pal}</span>
              </div>
              <Slider
                value={[segment.pal]}
                min={0}
                max={70}
                step={1}
                onValueChange={([value]) => onUpdate({ pal: value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Brightness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Segment Brightness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Brightness</Label>
              <span className="text-sm text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  )
}

interface ColorEditorProps {
  label: string
  color: [number, number, number]
  onChange: (color: [number, number, number]) => void
}

function ColorEditor({ label, color, onChange }: ColorEditorProps) {
  const [r, g, b] = color

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <ColorSwatch color={color} size="sm" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">R</Label>
          <Input
            type="number"
            min={0}
            max={255}
            value={r}
            onChange={(e) => onChange([parseInt(e.target.value, 10) || 0, g, b])}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">G</Label>
          <Input
            type="number"
            min={0}
            max={255}
            value={g}
            onChange={(e) => onChange([r, parseInt(e.target.value, 10) || 0, b])}
            className="h-8"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">B</Label>
          <Input
            type="number"
            min={0}
            max={255}
            value={b}
            onChange={(e) => onChange([r, g, parseInt(e.target.value, 10) || 0])}
            className="h-8"
          />
        </div>
      </div>
    </div>
  )
}
