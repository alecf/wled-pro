import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RangeInput } from '@/components/common'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WledTimer, ParsedPreset } from '@/types/wled'

interface TimerEditorDialogProps {
  open: boolean
  onClose: () => void
  onSave: (timer: WledTimer) => void
  onDelete?: () => void
  timer: WledTimer | null
  presets: ParsedPreset[]
  isSunriseSunset: boolean
  timerSlot: number
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

function DayToggle({
  selected,
  onToggle,
  label,
}: {
  selected: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        h-10 w-10 rounded-full font-medium text-sm transition-colors
        ${
          selected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }
      `}
    >
      {label}
    </button>
  )
}

export function TimerEditorDialog({
  open,
  onClose,
  onSave,
  onDelete,
  timer,
  presets,
  isSunriseSunset,
  timerSlot,
}: TimerEditorDialogProps) {
  const [enabled, setEnabled] = useState(1)
  const [hour, setHour] = useState(isSunriseSunset ? 255 : 7)
  const [minute, setMinute] = useState(0)
  const [presetId, setPresetId] = useState(1)
  const [daysOfWeek, setDaysOfWeek] = useState(127) // All days
  const [everyHour, setEveryHour] = useState(false)

  // Initialize form with timer data
  useEffect(() => {
    if (timer) {
      setEnabled(timer.en)
      setHour(timer.hour)
      setMinute(timer.min)
      setPresetId(timer.macro)
      setDaysOfWeek(timer.dow)
      setEveryHour(timer.hour === 24)
    } else {
      // Reset to defaults for new timer
      setEnabled(1)
      setHour(isSunriseSunset ? 255 : 7)
      setMinute(0)
      setPresetId(presets.length > 0 ? presets[0].id : 1)
      setDaysOfWeek(127)
      setEveryHour(false)
    }
  }, [timer, isSunriseSunset, presets])

  const handleToggleDay = (dayValue: number) => {
    setDaysOfWeek((prev) => prev ^ dayValue)
  }

  const handleQuickSelect = (selection: 'all' | 'weekdays' | 'weekends') => {
    switch (selection) {
      case 'all':
        setDaysOfWeek(127)
        break
      case 'weekdays':
        setDaysOfWeek(31) // Mon-Fri
        break
      case 'weekends':
        setDaysOfWeek(96) // Sat-Sun
        break
    }
  }

  const handleSave = () => {
    const newTimer: WledTimer = {
      en: enabled,
      hour: everyHour ? 24 : hour,
      min: minute,
      macro: presetId,
      dow: daysOfWeek,
    }

    // Add empty start/end for standard timers (slots 0-7)
    if (timerSlot < 8) {
      newTimer.start = { mon: 1, day: 1 }
      newTimer.end = { mon: 12, day: 31 }
    }

    onSave(newTimer)
    onClose()
  }

  const formatTime = (h: number, m: number): string => {
    const hour12 = h % 12 || 12
    const ampm = h < 12 ? 'AM' : 'PM'
    return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
  }

  const formatOffset = (minutes: number): string => {
    if (minutes === 0) return 'Exactly at sunrise/sunset'
    const sign = minutes > 0 ? '+' : ''
    return `${sign}${minutes} minutes`
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {timer ? 'Edit Schedule' : 'Add Schedule'} - Slot {timerSlot + 1}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preset Selection */}
          <div className="space-y-2">
            <Label>Preset to Trigger</Label>
            <Select
              value={presetId.toString()}
              onValueChange={(value) => setPresetId(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id.toString()}>
                    {preset.n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          {isSunriseSunset ? (
            <div className="space-y-2">
              <Label>
                {timerSlot === 8 ? 'Sunrise' : 'Sunset'} Offset
              </Label>
              <RangeInput
                label={formatOffset(minute)}
                value={minute}
                onChange={setMinute}
                min={-59}
                max={59}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Negative values trigger before {timerSlot === 8 ? 'sunrise' : 'sunset'},
                positive values trigger after
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Time</Label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={everyHour}
                      onChange={(e) => setEveryHour(e.target.checked)}
                      className="rounded"
                    />
                    Every hour
                  </label>
                </div>

                {!everyHour && (
                  <div className="space-y-2">
                    <RangeInput
                      label={`Hour: ${formatTime(hour, 0).split(':')[0]} ${formatTime(hour, 0).split(' ')[1]}`}
                      value={hour}
                      onChange={setHour}
                      min={0}
                      max={23}
                      step={1}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <RangeInput
                    label={`Minute: :${minute.toString().padStart(2, '0')}`}
                    value={minute}
                    onChange={setMinute}
                    min={0}
                    max={59}
                    step={1}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {everyHour
                    ? `Triggers every hour at :${minute.toString().padStart(2, '0')}`
                    : `Triggers at ${formatTime(hour, minute)}`}
                </p>
              </div>
            </>
          )}

          {/* Days of Week */}
          <div className="space-y-3">
            <Label>Days of Week</Label>

            <div className="flex gap-2 justify-between">
              {DAYS_OF_WEEK.map(({ label, value }) => (
                <DayToggle
                  key={value}
                  label={label}
                  selected={(daysOfWeek & value) !== 0}
                  onToggle={() => handleToggleDay(value)}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('all')}
              >
                Every day
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('weekdays')}
              >
                Weekdays
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('weekends')}
              >
                Weekends
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            {timer && onDelete ? (
              <Button variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={presets.length === 0}>
                {timer ? 'Save Changes' : 'Add Schedule'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
