import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'
import { PalettesScreen } from './PalettesScreen'

describe('PalettesScreen', () => {
  const device = useFakeWled()

  afterEach(() => localStorage.clear())

  it("shows the given controller's palettes, not the first saved controller's", async () => {
    // The first saved controller is a different (unreachable) device
    localStorage.setItem(
      'wled-pro-controllers',
      JSON.stringify([
        { url: 'http://other-wled.local', name: 'Other', addedAt: 0 },
        { url: device.baseUrl, name: 'Fake', addedAt: 1 },
      ]),
    )
    const Wrapper = device.wrapper()
    render(
      <Wrapper>
        <PalettesScreen baseUrl={device.baseUrl} />
      </Wrapper>,
    )

    expect(await screen.findByText(device.sim.palettes[1])).toBeInTheDocument()
    expect(screen.queryByText('No Palettes Available')).not.toBeInTheDocument()
  })
})
