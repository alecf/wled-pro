import { Input } from '@/components/ui/input'

export type IpAddress = [number, number, number, number]

interface IpAddressInputProps {
  /** Accessible name prefix for the four octet fields */
  label: string
  value: IpAddress | number[] | undefined
  /** Shown for octets missing from `value` */
  fallback?: IpAddress
  onChange: (value: IpAddress) => void
}

const OCTETS = [0, 1, 2, 3] as const

/** Four numeric fields (0-255) for an IPv4 address. */
export function IpAddressInput({
  label,
  value,
  fallback = [0, 0, 0, 0],
  onChange,
}: IpAddressInputProps) {
  const handleOctetChange = (index: number, raw: string) => {
    const octet = Math.max(0, Math.min(255, parseInt(raw, 10) || 0))
    const next = OCTETS.map((i) => value?.[i] ?? fallback[i]) as IpAddress
    next[index] = octet
    onChange(next)
  }

  return (
    <div className="flex gap-1">
      {OCTETS.map((i) => (
        <Input
          key={i}
          type="number"
          min={0}
          max={255}
          aria-label={`${label} octet ${i + 1}`}
          value={value?.[i] ?? fallback[i]}
          onChange={(e) => handleOctetChange(i, e.target.value)}
          className="px-2 text-center"
        />
      ))}
    </div>
  )
}
