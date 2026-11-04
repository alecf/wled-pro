import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import { configPosts, rowControl } from '@/test/settingsHelpers'
import type { WledFullConfig } from '@/types/wled'
import { SyncScreen } from './SyncScreen'

describe('SyncScreen', () => {
  const device = useFakeWled()
  const cfg = () => device.sim.cfg as unknown as WledFullConfig

  const renderSync = async () => {
    await renderWithController(device, <SyncScreen baseUrl={device.baseUrl} onBack={() => {}} />)
    await screen.findByText('Receive Colors')
  }

  it('saves one nested sync option and keeps its siblings', async () => {
    await renderSync()
    await userEvent.click(rowControl('Receive Colors'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().if.sync.recv.col).toBe(false))
    expect(cfg().if.sync.recv).toMatchObject({ bri: true, fx: true, grp: 1 })
    expect(cfg().if.sync.send).toMatchObject({ hue: true, grp: 1 })
    // Only the edited section is sent
    expect(configPosts(device).some((body) => JSON.stringify(body).includes('mqtt'))).toBe(false)
  })

  it('enables MQTT with a broker and password', async () => {
    await renderSync()
    await userEvent.click(rowControl('Enable MQTT'))
    await userEvent.type(await screen.findByLabelText('Broker Address'), '10.0.0.5')
    await userEvent.type(screen.getByLabelText('Password'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().if.mqtt.en).toBe(true))
    expect(cfg().if.mqtt).toMatchObject({
      broker: '10.0.0.5',
      pskl: 2,
      port: 1883,
      topics: { device: 'wled/000000', group: 'wled/all' },
    })
    expect(cfg().if.sync.recv.col).toBe(true)
  })

  it('saves several edited sections together', async () => {
    await renderSync()
    await userEvent.click(rowControl('Receive Effects'))
    await userEvent.click(rowControl('Enable MQTT'))
    await userEvent.click(rowControl('Alexa Emulation'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().if.va.alexa).toBe(true))
    expect(cfg().if.mqtt.en).toBe(true)
    expect(cfg().if.sync.recv.fx).toBe(false)
  })
})
