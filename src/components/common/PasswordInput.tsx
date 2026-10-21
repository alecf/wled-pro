import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  /** Length of the password stored on the device (WLED only reports the length) */
  currentLength?: number
  placeholder?: string
}

/** Password field with a show/hide toggle. */
export function PasswordInput({
  id,
  value,
  onChange,
  currentLength,
  placeholder = 'Enter password',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={currentLength ? `Current: ${currentLength} characters` : placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
