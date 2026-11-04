import { Info, Moon, Palette, Play, Sunrise, Timer, Zap } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { InfoBox } from '@/components/common/InfoBox'
import { ListItem, ListSection } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { RangeInput } from '@/components/common/RangeInput'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useControllerContext } from '@/contexts/ControllerContext'
import { formatDuration } from '@/lib/format'

interface TimerScreenProps {
  onBack: () => void
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

export function TimerScreen({ onBack }: TimerScreenProps) {
  const { state, queueUpdate, send } = useControllerContext()
  const [isStarting, setIsStarting] = useState(false)

  // Local edits - null means use server state
  const [localDuration, setLocalDuration] = useState<number | null>(null)
  const [localTargetBrightness, setLocalTargetBrightness] = useState<number | null>(null)
  const [localMode, setLocalMode] = useState<number | null>(null)

  const duration = localDuration ?? state?.nl.dur ?? 60
  const targetBrightness = localTargetBrightness ?? state?.nl.tbri ?? 0
  const mode = localMode ?? state?.nl.mode ?? 0

  // The device only reports `rem` when its state changes, so count down locally
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setEndsAt(state?.nl.on && state.nl.rem > 0 ? Date.now() + state.nl.rem * 1000 : null)
  }, [state?.nl.on, state?.nl.rem])
  useEffect(() => {
    if (endsAt === null) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [endsAt])
  const remaining = endsAt === null ? 0 : Math.max(0, Math.round((endsAt - now) / 1000))
  const completionTime =
    endsAt === null
      ? null
      : new Date(endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  // Settings changes are sent right away (debounced) without changing whether the timer runs
  const updateSettings = (changes: { dur?: number; mode?: number; tbri?: number }) => {
    queueUpdate({ nl: changes })
  }
  const handleDurationChange = (dur: number) => {
    setLocalDuration(dur)
    updateSettings({ dur })
  }
  const handleModeChange = (newMode: number) => {
    setLocalMode(newMode)
    updateSettings({ mode: newMode })
  }
  const handleTargetBrightnessChange = (tbri: number) => {
    setLocalTargetBrightness(tbri)
    updateSettings({ tbri })
  }

  const handleToggle = async (enabled: boolean) => {
    try {
      await send({
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

  const handleActivateNow = useCallback(async () => {
    setIsStarting(true)
    try {
      await send({
        nl: {
          on: true,
          dur: duration,
          mode: mode,
          tbri: targetBrightness,
        },
      })
      toast.success(`Timer started for ${formatDuration(duration)}`)
    } catch (error) {
      toast.error('Failed to start timer')
      console.error(error)
    } finally {
      setIsStarting(false)
    }
  }, [send, duration, mode, targetBrightness])

  if (!state) {
    return (
      <>
        <PageHeader title="Sleep Timer" onBack={onBack} belowAppHeader />
        <LoadingScreen />
      </>
    )
  }

  const isActive = state.nl.on
  const lightsOn = state.on

  return (
    <>
      <PageHeader title="Sleep Timer" onBack={onBack} belowAppHeader />
      <ScreenContainer className="p-4 space-y-6">
        {/* Lights off info box */}
        {!lightsOn && (
          <InfoBox
            variant="info"
            title="Lights are off"
            description="Turn on the lights to activate the sleep timer"
          />
        )}

        {/* Activate Now button - only visible when lights are on */}
        {lightsOn && !isActive && (
          <Button onClick={handleActivateNow} className="w-full" disabled={isStarting} size="lg">
            <Play className="mr-2 h-5 w-5" />
            {isStarting ? 'Starting...' : 'Activate Now'}
          </Button>
        )}

        {/* Timer Status */}
        <ListSection title="Status">
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
              <Switch checked={isActive} onCheckedChange={handleToggle} />
            </div>

            {isActive && completionTime && (
              <div className="pt-2 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Timer will complete at {completionTime}
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
              onChange={handleDurationChange}
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
              <ListItem key={m.id} onClick={() => handleModeChange(m.id)} active={mode === m.id}>
                <div className="flex items-center gap-3 min-h-[48px] w-full">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-muted-foreground">{m.description}</div>
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
              onChange={handleTargetBrightnessChange}
              min={0}
              max={255}
              step={1}
            />
            <div className="text-xs text-muted-foreground text-center">
              {targetBrightness === 0
                ? 'Lights will turn off completely'
                : `Lights will dim to ${Math.round((targetBrightness / 255) * 100)}% brightness`}
            </div>
          </div>
        </ListSection>

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
          <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">About Sleep Timer</p>
            <p>
              The sleep timer gradually transitions your lights over the specified duration. Perfect
              for creating a relaxing bedtime routine. Changes to settings are saved automatically.
            </p>
          </div>
        </div>
      </ScreenContainer>
    </>
  )
}
