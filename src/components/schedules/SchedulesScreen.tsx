import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { ListSection, ListItem } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Clock,
  Plus,
  Loader2,
  Info,
  AlertCircle,
  RefreshCw,
  Sunrise as SunriseIcon,
  Sunset as SunsetIcon
} from 'lucide-react'
import { useWledTimers, useSetTimers, useRebootDevice } from '@/hooks/useWled'
import { usePresets } from '@/hooks/usePresets'
import { toast } from 'sonner'

interface SchedulesScreenProps {
  baseUrl: string
  onBack: () => void
}

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 4 },
  { label: 'Thu', value: 8 },
  { label: 'Fri', value: 16 },
  { label: 'Sat', value: 32 },
  { label: 'Sun', value: 64 },
]

function formatTime(hour: number, min: number, isSunriseSunset: boolean): string {
  if (isSunriseSunset) {
    if (min === 0) return 'Exactly at sunrise/sunset'
    const sign = min > 0 ? '+' : ''
    return `${sign}${min} minutes`
  }

  if (hour === 24) {
    return `Every hour at :${min.toString().padStart(2, '0')}`
  }

  const h = hour % 12 || 12
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h}:${min.toString().padStart(2, '0')} ${ampm}`
}

function getDaysOfWeekLabel(dow: number): string {
  if (dow === 127) return 'Every day'
  if (dow === 31) return 'Weekdays'
  if (dow === 96) return 'Weekends'

  const days: string[] = []
  DAYS_OF_WEEK.forEach(({ label, value }) => {
    if (dow & value) days.push(label)
  })

  return days.join(', ') || 'Never'
}

export function SchedulesScreen({ baseUrl, onBack }: SchedulesScreenProps) {
  const { data: timersConfig, isLoading } = useWledTimers(baseUrl)
  const { presets } = usePresets(baseUrl)
  const setTimers = useSetTimers(baseUrl)
  const reboot = useRebootDevice(baseUrl)

  const [hasChanges, setHasChanges] = useState(false)

  const timers = timersConfig?.ins || []

  const handleToggleTimer = async (index: number) => {
    const timer = timers[index]
    if (!timer) return

    const newTimers = [...timers]
    newTimers[index] = { ...timer, en: timer.en ? 0 : 1 }

    try {
      await setTimers.mutateAsync(newTimers)
      toast.success(timer.en ? 'Schedule disabled' : 'Schedule enabled')
      setHasChanges(true)
    } catch (error) {
      toast.error('Failed to update schedule')
      console.error(error)
    }
  }

  const handleSaveAndReboot = async () => {
    if (confirm('Reboot device to apply schedule changes? The device will be unavailable for about 10 seconds.')) {
      try {
        await reboot.mutateAsync()
        toast.success('Device rebooting...')
        setHasChanges(false)
        setTimeout(() => {
          toast.info('Schedules are now active')
        }, 12000)
      } catch (error) {
        toast.error('Failed to reboot device')
        console.error(error)
      }
    }
  }

  if (isLoading) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="ghost" size="sm">
          Back
        </Button>
        <h1 className="text-xl font-semibold flex-1">Schedules</h1>
      </div>

      {/* Reboot Warning */}
      {hasChanges && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-500">Reboot Required</p>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule changes require a device reboot to take effect.
            </p>
          </div>
          <Button
            onClick={handleSaveAndReboot}
            variant="outline"
            size="sm"
            className="border-yellow-500/20"
            disabled={reboot.isPending}
          >
            {reboot.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Rebooting...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reboot Now
              </>
            )}
          </Button>
        </div>
      )}

      {/* Standard Timers (0-7) */}
      <ListSection title="Time-Based Schedules (8 slots)">
        {timers.slice(0, 8).map((timer, index) => {
          if (!timer || timer.macro === 0) {
            return (
              <ListItem key={index}>
                <div className="flex items-center gap-3 min-h-[48px] w-full opacity-50">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">Empty Slot {index + 1}</div>
                    <div className="text-sm text-muted-foreground">
                      Coming soon: tap to add a schedule
                    </div>
                  </div>
                </div>
              </ListItem>
            )
          }

          const preset = presets.find(p => p.id === timer.macro)
          const isEnabled = timer.en === 1

          return (
            <ListItem key={index}>
              <div className="flex items-center gap-3 min-h-[48px] w-full">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {formatTime(timer.hour, timer.min, false)}
                    {!isEnabled && (
                      <span className="text-xs text-muted-foreground">(Disabled)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {preset?.n || `Preset ${timer.macro}`} • {getDaysOfWeekLabel(timer.dow)}
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggleTimer(index)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </ListItem>
          )
        })}
      </ListSection>

      {/* Sunrise/Sunset Timers (8-9) */}
      <ListSection title="Sunrise & Sunset Schedules">
        {[8, 9].map((index) => {
          const timer = timers[index]
          const isSunrise = index === 8
          const Icon = isSunrise ? SunriseIcon : SunsetIcon
          const label = isSunrise ? 'Sunrise' : 'Sunset'

          if (!timer || timer.macro === 0) {
            return (
              <ListItem key={index}>
                <div className="flex items-center gap-3 min-h-[48px] w-full opacity-50">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted-foreground">
                      Coming soon: tap to add {label.toLowerCase()} schedule
                    </div>
                  </div>
                </div>
              </ListItem>
            )
          }

          const preset = presets.find(p => p.id === timer.macro)
          const isEnabled = timer.en === 1

          return (
            <ListItem key={index}>
              <div className="flex items-center gap-3 min-h-[48px] w-full">
                <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {label} {formatTime(255, timer.min, true)}
                    {!isEnabled && (
                      <span className="text-xs text-muted-foreground">(Disabled)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {preset?.n || `Preset ${timer.macro}`} • {getDaysOfWeekLabel(timer.dow)}
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggleTimer(index)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </ListItem>
          )
        })}
      </ListSection>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About Schedules</p>
          <p>
            Schedules automatically trigger presets at specific times. The device must have
            accurate time via NTP and a configured timezone. Sunrise/sunset schedules require
            latitude/longitude configuration.
          </p>
          <p className="mt-2">
            <strong>Important:</strong> Changes require a device reboot to take effect.
          </p>
        </div>
      </div>

      {/* TODO: Add timer editor dialog */}
    </ScreenContainer>
  )
}
