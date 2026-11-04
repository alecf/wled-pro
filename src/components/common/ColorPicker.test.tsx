import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ColorPicker } from './ColorPicker'

describe('ColorPicker', () => {
  it('marks the current preset and picks another', async () => {
    const onChange = vi.fn()
    render(<ColorPicker color={[255, 160, 0]} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Color #ffa000' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Color #0000ff' }))
    expect(onChange).toHaveBeenCalledWith([0, 0, 255])
  })

  it('picks any color with the custom picker', () => {
    const onChange = vi.fn()
    render(<ColorPicker color={[1, 2, 3]} onChange={onChange} />)
    const custom = screen.getByLabelText('Custom color')
    expect(custom).toHaveValue('#010203')
    fireEvent.change(custom, { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith([0x12, 0x34, 0x56])
  })

  it("keeps an RGBW color's white channel and doesn't mark an RGB preset for it", async () => {
    const onChange = vi.fn()
    render(<ColorPicker color={[255, 160, 0, 80]} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Color #ffa000' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Color #0000ff' }))
    expect(onChange).toHaveBeenCalledWith([0, 0, 255, 80])
  })
})
