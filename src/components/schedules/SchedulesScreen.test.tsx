import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import type { WledFullConfig, WledTimer } from '@/types/wled'
import { SchedulesScreen } from './SchedulesScreen'

const morning: WledTimer = {
  en: 1,
  hour: 6,
  min: 0,
  macro: 1,
  dow: 127,
  start: { mon: 1, day: 1 },
  end: { mon: 12, day: 31 },
}
const night: WledTimer = { ...morning, hour: 22, min: 15, macro: 2, dow: 31 }

describe('SchedulesScreen', () => {
  const device = useFakeWled()
  const timers = () => (device.sim.cfg as unknown as WledFullConfig).timers.ins

  const renderSchedules = async (seed: (WledTimer | null)[] = []) => {
    ;(device.sim.cfg as unknown as WledFullConfig).timers.ins = structuredClone(seed)
    await renderWithController(device, <SchedulesScreen onBack={() => {}} />)
    await screen.findByText('Time-Based Schedules')
  }

  it('adds a weekday schedule in the first free slot and asks for a reboot', async () => {
    await renderSchedules()
    await userEvent.click(screen.getByText('Add Schedule'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Time'), { target: { value: '07:30' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Weekdays' }))
    await userEvent.click(within(dialog).getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Party' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Schedule' }))

    await waitFor(() => expect(timers()[0]).toMatchObject({ en: 1, hour: 7, min: 30, macro: 2 }))
    expect(timers()[0]?.dow).toBe(31)
    expect(await screen.findByText('Reboot Required')).toBeInTheDocument()
  })

  it('edits one schedule without touching the others', async () => {
    await renderSchedules([morning, night])
    await userEvent.click(screen.getByText('6:00 AM'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Time'), { target: { value: '06:45' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(timers()[0]).toMatchObject({ hour: 6, min: 45, macro: 1 }))
    expect(timers()[1]).toEqual(night)
  })

  it('disables one schedule with its switch', async () => {
    await renderSchedules([morning, night])
    const switches = screen.getAllByRole('switch')
    await userEvent.click(switches[1])

    await waitFor(() => expect(timers()[1]?.en).toBe(0))
    expect(timers()[0]).toEqual(morning)
  })

  it('deletes a schedule after confirming', async () => {
    await renderSchedules([morning, night])
    await userEvent.click(screen.getByText('10:15 PM'))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )
    const confirm = await screen.findByRole('dialog', { name: 'Delete Schedule?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(timers()[1] ?? null).toBeNull())
    expect(timers()[0]).toEqual(morning)
  })

  it('adds a sunrise schedule with an offset in slot 9', async () => {
    await renderSchedules()
    await userEvent.click(screen.getByText('Add Sunrise Schedule'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText(/Sunrise Offset/), { target: { value: '-10' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add Schedule' }))

    await waitFor(() => expect(timers()[8]).toMatchObject({ hour: 255, min: -10, macro: 1 }))
    expect(timers()[8]?.start).toBeUndefined()
  })
})
