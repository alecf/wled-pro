/**
 * Render a controller screen the way the `_controller` layout does: one live connection
 * to a fake device (useWledWebSocket) shared through ControllerContext.
 *
 * ```tsx
 * const device = useFakeWled()
 * it('...', async () => {
 *   await renderWithController(device, <TimerScreen onBack={() => {}} />)
 *   await userEvent.click(screen.getByRole('button', { name: 'Activate Now' }))
 *   await device.sim.waitForState((s) => s.nl.on)
 * })
 * ```
 */
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { expect } from 'vitest'
import { ControllerContext } from '@/contexts/ControllerContext'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import type { useFakeWled } from './fake-wled/adapters/vitest'

type FakeDevice = ReturnType<typeof useFakeWled>

const CONNECTING = 'Connecting to fake device'

function Connected({ baseUrl, children }: { baseUrl: string; children: ReactNode }) {
  const connection = useWledWebSocket(baseUrl)
  if (!connection.state) return <div>{CONNECTING}</div>
  return (
    <ControllerContext.Provider
      value={{
        ...connection,
        controller: { url: baseUrl, name: 'Fake WLED', addedAt: 0 },
        onOpenControllerPicker: () => {},
      }}
    >
      {children}
    </ControllerContext.Provider>
  )
}

/** Renders `ui` once the connection has the device's state. */
export async function renderWithController(device: FakeDevice, ui: ReactNode) {
  const Wrapper = device.wrapper()
  const result = render(
    <Wrapper>
      <Connected baseUrl={device.baseUrl}>{ui}</Connected>
    </Wrapper>,
  )
  await waitFor(() => expect(screen.queryByText(CONNECTING)).not.toBeInTheDocument())
  return result
}
