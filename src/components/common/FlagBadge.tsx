import { cn } from '@/lib/utils'
import type { EffectFlags } from '@/lib/effects'

interface FlagBadgeProps {
  flag: keyof EffectFlags
  active: boolean
  className?: string
}

const flagConfig: Record<
  keyof EffectFlags,
  { label: string; icon: string; color: string }
> = {
  supports1D: { label: '1D', icon: '⋮', color: 'bg-blue-500/10 text-blue-600' },
  supports2D: { label: '2D', icon: '▦', color: 'bg-purple-500/10 text-purple-600' },
  volumeReactive: { label: 'Vol', icon: '♪', color: 'bg-green-500/10 text-green-600' },
  frequencyReactive: { label: 'Freq', icon: '♫', color: 'bg-orange-500/10 text-orange-600' },
}

export function FlagBadge({ flag, active, className }: FlagBadgeProps) {
  if (!active) return null

  const config = flagConfig[flag]
  if (!config) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
        config.color,
        className
      )}
      title={config.label}
    >
      <span>{config.icon}</span>
    </span>
  )
}

interface EffectFlagBadgesProps {
  flags: EffectFlags
  className?: string
}

export function EffectFlagBadges({ flags, className }: EffectFlagBadgesProps) {
  const activeFlags = Object.entries(flags).filter(([, active]) => active) as [
    keyof EffectFlags,
    boolean
  ][]

  if (activeFlags.length === 0) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {activeFlags.map(([flag]) => (
        <FlagBadge key={flag} flag={flag} active={true} />
      ))}
    </div>
  )
}
