import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Effect, EffectParameter } from '@/lib/effects'

interface ParameterValues {
  sx: number
  ix: number
  c1: number
  c2: number
  c3: number
  o1: boolean
  o2: boolean
  o3: boolean
}

interface EffectParameterControlsProps {
  effect: Effect
  values: Partial<ParameterValues>
  onChange: (key: string, value: number | boolean) => void
  readOnly?: boolean
}

export function EffectParameterControls({
  effect,
  values,
  onChange,
  readOnly = false,
}: EffectParameterControlsProps) {
  const { parameters } = effect

  if (parameters.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        This effect has no adjustable parameters
      </div>
    )
  }

  // Split into sliders and checkboxes
  const sliders = parameters.filter((p) => p.type === 'slider')
  const checkboxes = parameters.filter((p) => p.type === 'checkbox')

  return (
    <div className="space-y-4">
      {/* Sliders */}
      {sliders.map((param) => (
        <SliderParameter
          key={param.key}
          param={param}
          value={(values[param.key as keyof ParameterValues] as number) ?? param.default ?? 128}
          onChange={(v) => onChange(param.key, v)}
          readOnly={readOnly}
        />
      ))}

      {/* Checkboxes */}
      {checkboxes.length > 0 && (
        <div className="space-y-3 pt-2">
          {checkboxes.map((param) => (
            <CheckboxParameter
              key={param.key}
              param={param}
              value={(values[param.key as keyof ParameterValues] as boolean) ?? param.default ?? false}
              onChange={(v) => onChange(param.key, v)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface SliderParameterProps {
  param: EffectParameter
  value: number
  onChange: (value: number) => void
  readOnly: boolean
}

function SliderParameter({ param, value, onChange, readOnly }: SliderParameterProps) {
  const min = param.min ?? 0
  const max = param.max ?? 255

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{param.name}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        disabled={readOnly}
      />
    </div>
  )
}

interface CheckboxParameterProps {
  param: EffectParameter
  value: boolean
  onChange: (value: boolean) => void
  readOnly: boolean
}

function CheckboxParameter({ param, value, onChange, readOnly }: CheckboxParameterProps) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{param.name}</Label>
      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={readOnly}
      />
    </div>
  )
}

/**
 * Read-only display of effect parameters for the effects browser
 */
interface EffectParameterPreviewProps {
  effect: Effect
}

export function EffectParameterPreview({ effect }: EffectParameterPreviewProps) {
  const { parameters } = effect

  if (parameters.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No adjustable parameters
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {parameters.map((param) => (
        <div key={param.key} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{param.name}</span>
          <span className="font-mono text-xs">
            {param.type === 'slider'
              ? `${param.min ?? 0}-${param.max ?? 255}`
              : 'on/off'}
          </span>
        </div>
      ))}
    </div>
  )
}
