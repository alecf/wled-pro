import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Power, Sun, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MasterControlsProps {
  isOn: boolean
  brightness: number
  onToggle: () => void
  onBrightnessChange: (value: number) => void
  disabled?: boolean
  onActivateSleepTimer?: () => void
  sleepTimerActive?: boolean
}

export function MasterControls({
  isOn,
  brightness,
  onToggle,
  onBrightnessChange,
  disabled,
  onActivateSleepTimer,
  sleepTimerActive,
}: MasterControlsProps) {
  const brightnessPercent = Math.round((brightness / 255) * 100)

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
      {/* Power button */}
      <Button
        variant={isOn ? 'default' : 'outline'}
        size="icon"
        className={cn(
          'h-12 w-12 rounded-full shrink-0 transition-all',
          isOn && 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/25'
        )}
        onClick={onToggle}
        disabled={disabled}
      >
        <Power className="h-5 w-5" />
      </Button>

      {/* Sleep timer button - only visible when lights are on */}
      {isOn && onActivateSleepTimer && (
        <Button
          variant={sleepTimerActive ? 'default' : 'outline'}
          size="icon"
          className={cn(
            'h-12 w-12 rounded-full shrink-0 transition-all',
            sleepTimerActive && 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25'
          )}
          onClick={onActivateSleepTimer}
          disabled={disabled}
          title="Activate sleep timer"
        >
          <Timer className="h-5 w-5" />
        </Button>
      )}

      {/* Brightness slider */}
      <div className="flex-1 flex items-center gap-3">
        <Sun className="h-4 w-4 text-muted-foreground shrink-0" />
        <Slider
          value={[brightness]}
          max={255}
          step={1}
          disabled={!isOn || disabled}
          onValueChange={([value]) => onBrightnessChange(value)}
          className="flex-1"
        />
        <span className="text-sm text-muted-foreground w-10 text-right shrink-0">
          {brightnessPercent}%
        </span>
      </div>
    </div>
  )
}
