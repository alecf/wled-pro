import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import type { FileSegmentStore } from '@/types/segments'
import type { WledInfo } from '@/types/wled'
import { SegmentsScreen } from './SegmentsScreen'

const FILE = '/wled-pro-segments.json'
const info = { leds: { count: 30 } } as WledInfo

/** The row for the global segment shown as `name` */
function segmentRow(name: string) {
  let el: HTMLElement | null = screen.getByText(name)
  while (el && !within(el).queryByTitle('Split segment')) el = el.parentElement
  if (!el) throw new Error(`No row for ${name}`)
  return within(el)
}

describe('SegmentsScreen', () => {
  const device = useFakeWled()

  const savedFile = () =>
    JSON.parse(device.sim.files.get(FILE) ?? 'null') as FileSegmentStore | null

  const renderSegments = async (store?: Pick<FileSegmentStore, 'segments' | 'groups'>) => {
    if (store) device.sim.files.set(FILE, JSON.stringify({ version: 1, lastModified: 0, ...store }))
    const Wrapper = device.wrapper()
    render(
      <Wrapper>
        <SegmentsScreen controllerId={device.baseUrl} info={info} />
      </Wrapper>,
    )
    await waitFor(() => expect(screen.queryByText('Loading segments...')).not.toBeInTheDocument())
  }

  const layout = {
    segments: [
      { id: 'a', start: 0, stop: 10, name: 'Kitchen' },
      { id: 'b', start: 10, stop: 30, name: 'Hall' },
    ],
    groups: [],
  }

  /** Waits for the write of the segments file */
  const waitForFile = (check: (file: FileSegmentStore) => void) =>
    waitFor(
      () => {
        const file = savedFile()
        expect(file).not.toBeNull()
        check(file as FileSegmentStore)
      },
      { timeout: 2000 },
    )

  it('creates a first full-strip segment when the controller has no file', async () => {
    await renderSegments()
    await userEvent.click(screen.getByRole('button', { name: 'Create First Segment' }))

    await waitForFile((file) =>
      expect(file.segments).toMatchObject([{ start: 0, stop: 30, name: 'Full Strip' }]),
    )
  })

  it('renames a segment', async () => {
    await renderSegments(layout)
    await userEvent.click(segmentRow('Kitchen').getByTitle('Edit name'))
    const input = screen.getByDisplayValue('Kitchen')
    await userEvent.clear(input)
    await userEvent.type(input, 'Pantry{Enter}')

    await waitForFile((file) =>
      expect(file.segments.map((s) => s.name)).toEqual(['Pantry', 'Hall']),
    )
  })

  it('lists segments in LED order, whatever order the file has them in', async () => {
    await renderSegments({ segments: [...layout.segments].reverse(), groups: [] })
    const names = screen.getAllByText(/^(Kitchen|Hall)$/).map((el) => el.textContent)
    expect(names).toEqual(['Kitchen', 'Hall'])
  })

  it('goes back to the saved layout when a write fails', async () => {
    await renderSegments(layout)
    device.sim.fail('/edit', { status: 500, times: 1 })
    await userEvent.click(segmentRow('Kitchen').getByTitle('Edit name'))
    const input = screen.getByDisplayValue('Kitchen')
    await userEvent.clear(input)
    await userEvent.type(input, 'Pantry{Enter}')

    expect(await screen.findByText('Kitchen')).toBeInTheDocument()
    expect(screen.queryByText('Pantry')).not.toBeInTheDocument()
    expect(savedFile()?.segments.map((s) => s.name)).toEqual(['Kitchen', 'Hall'])
  })

  it('splits a segment at a position', async () => {
    await renderSegments(layout)
    await userEvent.click(segmentRow('Hall').getByTitle('Split segment'))
    const dialog = within(await screen.findByRole('dialog'))
    fireEvent.change(dialog.getByRole('spinbutton'), { target: { value: '20' } })
    await userEvent.click(dialog.getByRole('button', { name: 'Split Segment' }))

    await waitForFile((file) =>
      expect(file.segments.map(({ start, stop, name }) => ({ start, stop, name }))).toEqual(
        expect.arrayContaining([
          { start: 0, stop: 10, name: 'Kitchen' },
          { start: 10, stop: 20, name: 'Hall' },
          { start: 20, stop: 30, name: 'Hall (2)' },
        ]),
      ),
    )
  })

  it('merges a segment into the one above', async () => {
    await renderSegments(layout)
    await userEvent.click(segmentRow('Hall').getByTitle('Merge segment'))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('button', { name: 'Merge up into Kitchen' }))

    await waitForFile((file) =>
      expect(file.segments).toMatchObject([{ start: 0, stop: 30, name: 'Kitchen' }]),
    )
  })

  it('creates a group and assigns a segment to it', async () => {
    await renderSegments(layout)
    await userEvent.click(screen.getByRole('button', { name: /Add Group/ }))
    await userEvent.type(await screen.findByLabelText('Group Name'), 'Downstairs')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitForFile((file) => expect(file.groups).toMatchObject([{ name: 'Downstairs' }]))

    await userEvent.click(segmentRow('Kitchen').getByTitle('Assign to group'))
    const dialog = within(await screen.findByRole('dialog'))
    await userEvent.click(dialog.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Downstairs' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Assign' }))

    await waitForFile((file) => {
      const groupId = file.groups[0].id
      expect(file.segments.find((s) => s.name === 'Kitchen')?.groupId).toBe(groupId)
      expect(file.segments.find((s) => s.name === 'Hall')?.groupId).toBeUndefined()
    })
  })

  it('never offers to replace a saved layout it could not read', async () => {
    const saved = JSON.stringify({
      version: 1,
      lastModified: 0,
      segments: [
        { id: 'a', start: 0, stop: 10, name: 'Kitchen' },
        { id: 'b', start: 10, stop: 30, name: 'Hall' },
      ],
      groups: [],
    })
    device.sim.files.set(FILE, saved)
    device.sim.latency({ match: FILE, ms: 50 })
    device.sim.fail(FILE, { networkError: true, times: 1 })
    const Wrapper = device.wrapper()
    render(
      <Wrapper>
        <SegmentsScreen controllerId={device.baseUrl} info={info} />
      </Wrapper>,
    )

    // While loading, and after the read fails, an empty list must not look like "no layout"
    expect(screen.getByText('Loading segments...')).toBeInTheDocument()
    expect(screen.queryByText('Create First Segment')).not.toBeInTheDocument()
    expect(await screen.findByText('Failed to load segments')).toBeInTheDocument()
    expect(screen.queryByText('Create First Segment')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(await screen.findByText('Kitchen')).toBeInTheDocument()
    expect(screen.getByText('Hall')).toBeInTheDocument()
    expect(device.sim.requests.some((r) => r.path === '/edit')).toBe(false)
    expect(device.sim.files.get(FILE)).toBe(saved)
  })
})
