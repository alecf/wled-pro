import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { renderWithController } from '@/test/renderWithController'
import { configPosts } from '@/test/settingsHelpers'
import type { WledFullConfig } from '@/types/wled'
import { WifiScreen } from './WifiScreen'

describe('WifiScreen', () => {
  const device = useFakeWled()
  const cfg = () => device.sim.cfg as unknown as WledFullConfig

  const renderWifi = async () => {
    await renderWithController(device, <WifiScreen onBack={() => {}} />)
    await screen.findByLabelText('Network Name (SSID)')
  }

  it('shows Save only once something changed', async () => {
    await renderWifi()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Network Name (SSID)'), 'X')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('saves the network name and password, keeping the rest of the network config', async () => {
    await renderWifi()
    const ssid = screen.getByLabelText('Network Name (SSID)')
    await userEvent.clear(ssid)
    await userEvent.type(ssid, 'HomeNet')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().nw.ins[0].ssid).toBe('HomeNet'))
    expect(cfg().nw.ins[0]).toMatchObject({ pskl: 9, sn: [255, 255, 255, 0], ip: [0, 0, 0, 0] })
    // The access point wasn't edited, so it isn't sent
    expect(configPosts(device).some((body) => 'ap' in body)).toBe(false)
    expect(cfg().ap).toMatchObject({ ssid: 'WLED-AP', chan: 1, behav: 0 })
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument(),
    )
  })

  it('saves access point changes without sending the network config', async () => {
    await renderWifi()
    const apSsid = screen.getByLabelText('AP Name (SSID)')
    await userEvent.clear(apSsid)
    await userEvent.type(apSsid, 'Lights-AP')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().ap.ssid).toBe('Lights-AP'))
    expect(configPosts(device).some((body) => 'nw' in body)).toBe(false)
    expect(cfg().nw.ins[0].ssid).toBe('FakeNet')
  })

  it('saves network and access point edits in one request', async () => {
    await renderWifi()
    await userEvent.type(screen.getByLabelText('Network Name (SSID)'), '2')
    const apSsid = screen.getByLabelText('AP Name (SSID)')
    await userEvent.clear(apSsid)
    await userEvent.type(apSsid, 'Lights-AP')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().ap.ssid).toBe('Lights-AP'))
    expect(cfg().nw.ins[0].ssid).toBe('FakeNet2')
    expect(configPosts(device)).toHaveLength(1)
  })

  it('switching to a static IP fills in a default address', async () => {
    await renderWifi()
    await userEvent.click(screen.getByLabelText('Use Static IP'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cfg().nw.ins[0].ip).toEqual([192, 168, 1, 100]))
    expect(cfg().nw.ins[0]).toMatchObject({ gw: [192, 168, 1, 1], sn: [255, 255, 255, 0] })
  })

  it('keeps the edits when saving fails', async () => {
    device.sim.fail((r) => r.method === 'POST' && r.path === '/json/cfg', { status: 500, times: 1 })
    await renderWifi()
    await userEvent.type(screen.getByLabelText('Network Name (SSID)'), '2')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(device.sim.requests.some((r) => r.failed)).toBe(true))
    expect(screen.getByLabelText('Network Name (SSID)')).toHaveValue('FakeNet2')
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(cfg().nw.ins[0].ssid).toBe('FakeNet')
  })
})
