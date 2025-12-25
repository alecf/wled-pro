import { useEffect, useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { RangeInput, ListSection, ListItem } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Timer,
  Moon,
  Zap,
  Sunrise,
  Palette,
  Info
} from 'lucide-react'
import { useWledState, useWledMutation } from '@/hooks/useWled'
import { toast } from 'sonner'

interface TimerScreenProps {
  baseUrl: string
}

const TIMER_MODES = [
  { id: 0, name: 'Instant', icon: Zap, description: 'Turn off immediately when timer ends' },
  { id: 1, name: 'Fade', icon: Moon, description: 'Gradually dim to target brightness' },
  { id: 2, name: 'Color Fade', icon: Palette, description: 'Fade through colors to target' },
  { id: 3, name: 'Sunrise', icon: Sunrise, description: 'Simulate sunrise effect' },
] as const

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }
  return `${hours}h ${mins}m`
}

export function TimerScreen({ baseUrl }: TimerScreenProps) {
  const { data: state, isLoading } = useWledState(baseUrl)
  const mutation = useWledMutation(baseUrl)

  // Local state for sliders (to avoid lag during dragging)
  const [duration, setDuration] = useState(60)
  const [targetBrightness, setTargetBrightness] = useState(0)
  const [mode, setMode] = useState(0)

  // Sync with server state
  useEffect(() => {
    if (state?.nl) {
      setDuration(state.nl.dur)
      setTargetBrightness(state.nl.tbri)
      setMode(state.nl.mode)
    }
  }, [state?.nl])

  const handleToggle = async (enabled: boolean) => {
    try {
      await mutation.mutateAsync({
        nl: {
          on: enabled,
          dur: duration,
          mode: mode,
          tbri: targetBrightness,
        },
      })

      if (enabled) {
        toast.success(`Timer started for ${formatDuration(duration)}`)
      } else {
        toast.success('Timer cancelled')
      }
    } catch (error) {
      toast.error(`Failed to ${enabled ? 'start' : 'stop'} timer`)
      console.error(error)
    }
  }

  const handleApplySettings = async () => {
    try {
      await mutation.mutateAsync({
        nl: {
          on: state?.nl.on || false,
          dur: duration,
          mode: mode,
          tbri: targetBrightness,
        },
      })
      toast.success('Timer settings updated')
    } catch (error) {
      toast.error('Failed to update timer settings')
      console.error(error)
    }
  }

  if (isLoading || !state) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </ScreenContainer>
    )
  }

  const isActive = state.nl.on
  const remaining = state.nl.rem

  return (
    <ScreenContainer className="p-4 space-y-6">
      {/* Timer Status */}
      <ListSection title="Sleep Timer">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">Timer Active</div>
                {isActive && remaining > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {formatTime(remaining)} remaining
                  </div>
                )}
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
            />
          </div>

          {isActive && (
            <div className="pt-2 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Timer will complete at{' '}
                {new Date(Date.now() + remaining * 1000).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            </div>
          )}
        </div>
      </ListSection>

      {/* Duration */}
      <ListSection title="Duration">
        <div className="p-4 space-y-2">
          <RangeInput
            label={formatDuration(duration)}
            value={duration}
            onChange={setDuration}
            min={1}
            max={255}
            step={1}
          />
          <div className="text-xs text-muted-foreground text-center">
            Timer will run for {formatDuration(duration)}
          </div>
        </div>
      </ListSection>

      {/* Mode Selection */}
      <ListSection title="Mode">
        {TIMER_MODES.map((m) => {
          const Icon = m.icon
          return (
            <ListItem
              key={m.id}
              onClick={() => setMode(m.id)}
              active={mode === m.id}
            >
              <div className="flex items-center gap-3 min-h-[48px] w-full">
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {m.description}
                  </div>
                </div>
              </div>
            </ListItem>
          )
        })}
      </ListSection>

      {/* Target Brightness */}
      <ListSection title="Target Brightness">
        <div className="p-4 space-y-2">
          <RangeInput
            label={`${Math.round((targetBrightness / 255) * 100)}%`}
            value={targetBrightness}
            onChange={setTargetBrightness}
            min={0}
            max={255}
            step={1}
          />
          <div className="text-xs text-muted-foreground text-center">
            {targetBrightness === 0
              ? 'Lights will turn off completely'
              : `Lights will dim to ${Math.round((targetBrightness / 255) * 100)}% brightness`
            }
          </div>
        </div>
      </ListSection>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About Sleep Timer</p>
          <p>
            The sleep timer gradually transitions your lights over the specified duration.
            Perfect for creating a relaxing bedtime routine.
          </p>
        </div>
      </div>

      {/* Apply Settings Button */}
      {!isActive && (
        <Button
          onClick={handleApplySettings}
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Updating...' : 'Save Settings'}
        </Button>
      )}
    </ScreenContainer>
  )
}
