import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NumberFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  description?: string
  className?: string
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  description,
  className,
}: NumberFieldProps) {
  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <Input
          id={id}
          type="number"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0
            const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, val))
            onChange(clamped)
          }}
          min={min}
          max={max}
        />
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

interface SelectFieldProps {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
  options: { id: number; name: string }[]
  description?: string
  className?: string
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  description,
  className,
}: SelectFieldProps) {
  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full p-2 border border-border rounded-md bg-background text-sm"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  description?: string
  className?: string
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  className,
}: TextFieldProps) {
  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}
