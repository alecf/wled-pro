import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'

interface RangeInputProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  label?: string
  showValue?: boolean
}

export function RangeInput({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  label,
  showValue = true,
}: RangeInputProps) {
  const handleSliderChange = ([newValue]: number[]) => {
    onChange(newValue)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    if (!isNaN(newValue)) {
      onChange(Math.max(min, Math.min(max, newValue)))
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          {showValue && (
            <Input
              type="number"
              value={value}
              min={min}
              max={max}
              step={step}
              onChange={handleInputChange}
              disabled={disabled}
              className="w-16 h-7 text-xs text-right"
            />
          )}
        </div>
      )}
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleSliderChange}
        disabled={disabled}
      />
    </div>
  )
}
