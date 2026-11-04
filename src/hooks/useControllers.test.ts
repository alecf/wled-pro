import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useControllers } from './useControllers'

describe('useControllers', () => {
  afterEach(() => localStorage.clear())

  it('adds a controller with a normalized URL and its hostname as the default name', () => {
    const { result } = renderHook(() => useControllers())
    act(() => {
      result.current.addController(' 192.168.1.50/ ')
    })
    expect(result.current.controllers).toMatchObject([
      { url: 'http://192.168.1.50', name: '192.168.1.50' },
    ])
  })

  it('does not add the same controller twice', () => {
    const { result } = renderHook(() => useControllers())
    act(() => {
      result.current.addController('http://wled.local', 'Desk')
      result.current.addController('wled.local', 'Other name')
    })
    expect(result.current.controllers).toHaveLength(1)
    expect(result.current.controllers[0].name).toBe('Desk')
  })

  it('rejects an address without a host', () => {
    const { result } = renderHook(() => useControllers())
    expect(() => result.current.addController('http://')).toThrow()
    expect(result.current.controllers).toHaveLength(0)
  })

  it('renames, selects and removes, and every user of the hook sees it', () => {
    const a = renderHook(() => useControllers())
    const b = renderHook(() => useControllers())
    act(() => {
      a.result.current.addController('http://wled.local', 'Desk')
      a.result.current.selectController('http://wled.local')
      a.result.current.updateController('http://wled.local', { name: 'Shelf' })
    })
    expect(b.result.current.controllers[0].name).toBe('Shelf')
    expect(b.result.current.selectedUrl).toBe('http://wled.local')

    act(() => {
      b.result.current.removeController('http://wled.local')
      b.result.current.selectController(null)
    })
    expect(a.result.current.controllers).toEqual([])
    expect(a.result.current.selectedUrl).toBeNull()
  })

  it('survives a reload and corrupt storage', () => {
    localStorage.setItem(
      'wled-pro-controllers',
      JSON.stringify([{ url: 'http://a.local', name: 'A', addedAt: 1 }]),
    )
    expect(renderHook(() => useControllers()).result.current.controllers[0].name).toBe('A')

    localStorage.setItem('wled-pro-controllers', '{oops')
    expect(renderHook(() => useControllers()).result.current.controllers).toEqual([])
  })
})
