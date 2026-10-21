import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ParsedPreset, WledTimer } from '@/types/wled'

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
  // The parent mounts this dialog with a `key` per slot, so initial values are read once.
  // (Syncing from props in an effect reset the form whenever presets refetched.)
  const [enabled] = useState(timer?.en ?? 1)
  const [hour, setHour] = useState(timer?.hour ?? (isSunriseSunset ? 255 : 7))
  const [minute, setMinute] = useState(timer?.min ?? 0)
  const [presetId, setPresetId] = useState(timer?.macro ?? presets[0]?.id ?? 1)
  const [daysOfWeek, setDaysOfWeek] = useState(timer?.dow ?? 127) // All days
  const [everyHour, setEveryHour] = useState(timer?.hour === 24)

  // Convert hour/minute to time string for input
  const getTimeValue = (): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  }

  // Handle time input change
  const handleTimeChange = (timeString: string) => {
    const [h, m] = timeString.split(':').map(Number)
    setHour(h)
    setMinute(m)
  }

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

  const formatOffset = (minutes: number): string => {
    if (minutes === 0) return 'Exactly at sunrise/sunset'
    const sign = minutes > 0 ? '+' : ''
    const absMin = Math.abs(minutes)
    return `${sign}${absMin} minute${absMin !== 1 ? 's' : ''}`
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
              onValueChange={(value) => setPresetId(parseInt(value, 10))}
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
              <Label htmlFor="offset">
                {timerSlot === 8 ? 'Sunrise' : 'Sunset'} Offset (minutes)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  id="offset"
                  type="number"
                  min={-59}
                  max={59}
                  step={1}
                  value={minute}
                  onChange={(e) => setMinute(parseInt(e.target.value, 10) || 0)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatOffset(minute)}
                <br />
                Negative = before, Positive = after
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Time</Label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={everyHour}
                    onChange={(e) => setEveryHour(e.target.checked)}
                    className="rounded cursor-pointer"
                  />
                  Every hour
                </label>
              </div>

              {everyHour ? (
                <div className="space-y-2">
                  <Label htmlFor="minute">At Minute</Label>
                  <Select
                    value={minute.toString()}
                    onValueChange={(value) => setMinute(parseInt(value, 10))}
                  >
                    <SelectTrigger id="minute">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">:00</SelectItem>
                      <SelectItem value="15">:15</SelectItem>
                      <SelectItem value="30">:30</SelectItem>
                      <SelectItem value="45">:45</SelectItem>
                      {[...Array(60)].map(
                        (_, i) =>
                          ![0, 15, 30, 45].includes(i) && (
                            <SelectItem key={i} value={i.toString()}>
                              :{i.toString().padStart(2, '0')}
                            </SelectItem>
                          ),
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Triggers every hour at :{minute.toString().padStart(2, '0')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <input
                    id="time"
                    type="time"
                    value={getTimeValue()}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              )}
            </div>
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
