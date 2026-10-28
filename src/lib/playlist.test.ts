import { describe, expect, it } from 'vitest'
import { itemsToPlaylist, newPlaylistItem, playlistToItems } from '@/lib/playlist'

describe('playlist conversion', () => {
  it('reads stored durations as seconds and keeps a 0 (manual advance) duration', () => {
    expect(playlistToItems({ ps: [3, 5], dur: [150, 0], transition: [2, 4] })).toEqual([
      { presetId: 3, duration: 15, transition: 2 },
      { presetId: 5, duration: 0, transition: 4 },
    ])
  })

  it('reads scalar and short arrays the way WLED does', () => {
    expect(playlistToItems({ ps: [1, 2, 3], dur: 50, transition: [3] })).toEqual([
      { presetId: 1, duration: 5, transition: 3 },
      { presetId: 2, duration: 5, transition: 3 },
      { presetId: 3, duration: 5, transition: 3 },
    ])
    expect(playlistToItems({ ps: [1, 2], dur: [150], transition: 20 })).toEqual([
      { presetId: 1, duration: 15, transition: 20 },
      { presetId: 2, duration: 15, transition: 20 },
    ])
  })

  it('defaults missing values', () => {
    expect(playlistToItems({ ps: [1], dur: [] })).toEqual([
      { presetId: 1, duration: 10, transition: 7 },
    ])
  })

  it('round-trips through the stored format', () => {
    const items = [newPlaylistItem(1), { presetId: 2, duration: 2.5, transition: 0 }]
    const stored = itemsToPlaylist(items, { repeat: 3, end: 1 })
    expect(stored).toEqual({ ps: [1, 2], dur: [100, 25], transition: [7, 0], repeat: 3, end: 1 })
    expect(playlistToItems(stored)).toEqual(items)
  })
})
