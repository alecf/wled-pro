import { Clock, Plus, Sunrise as SunriseIcon, Sunset as SunsetIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { InfoBox } from '@/components/common/InfoBox'
import { ListSection } from '@/components/common/List'
import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'
import { RebootPrompt } from '@/components/common/RebootPrompt'
import { SettingsPage } from '@/components/common/SettingsPage'
import { Switch } from '@/components/ui/switch'
import { usePresets } from '@/hooks/usePresets'
import { useSetTimers, useWledTimers } from '@/hooks/useWled'
import type { ParsedPreset, WledTimer } from '@/types/wled'
import { TimerEditorDialog } from './TimerEditorDialog'

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

/** WLED timer slots 0-7 are time-based; 8 is sunrise and 9 is sunset. */
const TIME_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7]
const SUNRISE_SLOT = 8
const SUNSET_SLOT = 9

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

  const days = DAYS_OF_WEEK.filter(({ value }) => dow & value).map(({ label }) => label)
  return days.join(', ') || 'Never'
}

const isActive = (timer: WledTimer | null | undefined): timer is WledTimer =>
  !!timer && timer.macro !== 0

interface TimerRowProps {
  icon: React.ComponentType<{ className?: string }>
  time: string
  timer: WledTimer
  presets: ParsedPreset[]
  onClick: () => void
  onToggle: () => void
}

function TimerRow({ icon, time, timer, presets, onClick, onToggle }: TimerRowProps) {
  const preset = presets.find((p) => p.id === timer.macro)
  const isEnabled = timer.en === 1

  return (
    <ListItemWithIcon
      icon={icon}
      title={
        <span className="flex items-center gap-2">
          {time}
          {!isEnabled && <span className="text-xs text-muted-foreground">(Disabled)</span>}
        </span>
      }
      subtitle={`${preset?.n || `Preset ${timer.macro}`} • ${getDaysOfWeekLabel(timer.dow)}`}
      onClick={onClick}
      rightElement={
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
        />
      }
    />
  )
}

interface AddRowProps {
  title: string
  subtitle: string
  onClick: () => void
}

function AddRow({ title, subtitle, onClick }: AddRowProps) {
  return (
    <ListItemWithIcon
      icon={Plus}
      iconClassName="text-primary"
      title={<span className="text-primary">{title}</span>}
      subtitle={subtitle}
      onClick={onClick}
      rightElement={null}
    />
  )
}

export function SchedulesScreen({ baseUrl, onBack }: SchedulesScreenProps) {
  const { data: timersConfig, isLoading } = useWledTimers(baseUrl)
  const { presets } = usePresets(baseUrl)
  const setTimers = useSetTimers(baseUrl)

  const [needsReboot, setNeedsReboot] = useState(false)
  const [editingTimerId, setEditingTimerId] = useState<number | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const timers = timersConfig?.ins || []

  const handleAddNewTimer = () => {
    const freeSlot = TIME_SLOTS.find((slot) => !isActive(timers[slot]))
    if (freeSlot === undefined) {
      toast.error('All timer slots are full')
      return
    }
    setEditingTimerId(freeSlot)
  }

  const handleCloseEditor = () => setEditingTimerId(null)

  const handleSaveTimer = async (timer: WledTimer) => {
    if (editingTimerId === null) return

    const newTimers = [...timers]
    // Ensure we have 10 slots
    while (newTimers.length < 10) {
      newTimers.push(null)
    }
    newTimers[editingTimerId] = timer

    try {
      await setTimers.mutateAsync(newTimers)
      toast.success('Schedule saved')
      setNeedsReboot(true)
      handleCloseEditor()
    } catch (error) {
      toast.error('Failed to save schedule')
      console.error(error)
    }
  }

  const handleDeleteTimer = async () => {
    if (editingTimerId === null) return

    const newTimers = [...timers]
    newTimers[editingTimerId] = null

    try {
      await setTimers.mutateAsync(newTimers)
      toast.success('Schedule deleted')
      setNeedsReboot(true)
      handleCloseEditor()
    } catch (error) {
      toast.error('Failed to delete schedule')
      console.error(error)
    }
  }

  const handleToggleTimer = async (index: number) => {
    const timer = timers[index]
    if (!timer) return

    const newTimers = [...timers]
    newTimers[index] = { ...timer, en: timer.en ? 0 : 1 }

    try {
      await setTimers.mutateAsync(newTimers)
      toast.success(timer.en ? 'Schedule disabled' : 'Schedule enabled')
      setNeedsReboot(true)
    } catch (error) {
      toast.error('Failed to update schedule')
      console.error(error)
    }
  }

  const availableTimeSlots = TIME_SLOTS.filter((slot) => !isActive(timers[slot])).length

  const sunSlots = [
    { slot: SUNRISE_SLOT, label: 'Sunrise', icon: SunriseIcon },
    { slot: SUNSET_SLOT, label: 'Sunset', icon: SunsetIcon },
  ]

  return (
    <SettingsPage title="Schedules" onBack={onBack} isLoading={isLoading}>
      <RebootPrompt
        baseUrl={baseUrl}
        show={needsReboot}
        title="Reboot Required"
        message="Schedule changes require a device reboot to take effect."
        confirmMessage="Reboot device to apply schedule changes? The device will be unavailable for about 10 seconds."
        onReconnected={() => setNeedsReboot(false)}
      />

      <ListSection title="Time-Based Schedules">
        {TIME_SLOTS.map((slot) => {
          const timer = timers[slot]
          if (!isActive(timer)) return null
          return (
            <TimerRow
              key={slot}
              icon={Clock}
              time={formatTime(timer.hour, timer.min, false)}
              timer={timer}
              presets={presets}
              onClick={() => setEditingTimerId(slot)}
              onToggle={() => handleToggleTimer(slot)}
            />
          )
        })}

        {availableTimeSlots > 0 && (
          <AddRow
            title="Add Schedule"
            subtitle={`${availableTimeSlots} slot${availableTimeSlots !== 1 ? 's' : ''} available`}
            onClick={handleAddNewTimer}
          />
        )}
      </ListSection>

      <ListSection title="Sunrise & Sunset Schedules">
        {sunSlots.map(({ slot, label, icon }) => {
          const timer = timers[slot]
          if (!isActive(timer)) return null
          return (
            <TimerRow
              key={slot}
              icon={icon}
              time={`${label} ${formatTime(255, timer.min, true)}`}
              timer={timer}
              presets={presets}
              onClick={() => setEditingTimerId(slot)}
              onToggle={() => handleToggleTimer(slot)}
            />
          )
        })}

        {sunSlots.map(({ slot, label }) =>
          isActive(timers[slot]) ? null : (
            <AddRow
              key={slot}
              title={`Add ${label} Schedule`}
              subtitle={`Trigger a preset at ${label.toLowerCase()} ± offset`}
              onClick={() => setEditingTimerId(slot)}
            />
          ),
        )}
      </ListSection>

      <InfoBox
        variant="muted"
        title="About Schedules"
        description={
          <>
            <p>
              Schedules automatically trigger presets at specific times. The device must have
              accurate time via NTP and a configured timezone. Sunrise/sunset schedules require
              latitude/longitude configuration.
            </p>
            <p className="mt-2">
              <strong>Important:</strong> Changes require a device reboot to take effect.
            </p>
          </>
        }
      />

      {editingTimerId !== null && (
        <TimerEditorDialog
          key={editingTimerId}
          open
          onClose={handleCloseEditor}
          onSave={handleSaveTimer}
          // An inactive slot (macro 0, e.g. the always-saved sunrise/sunset entries) is a new timer
          onDelete={isActive(timers[editingTimerId]) ? () => setConfirmDeleteOpen(true) : undefined}
          timer={isActive(timers[editingTimerId]) ? timers[editingTimerId] : null}
          presets={presets}
          isSunriseSunset={editingTimerId >= SUNRISE_SLOT}
          timerSlot={editingTimerId}
        />
      )}

      <ConfirmationDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete Schedule?"
        description="This schedule will be removed from the device."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDeleteTimer}
      />
    </SettingsPage>
  )
}
