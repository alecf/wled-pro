import type { WledPlaylist } from '@/types/wled'

/** A playlist entry as the editor shows it */
export interface PlaylistItem {
  presetId: number
  /** Seconds */
  duration: number
  /** Tenths of a second, as WLED stores it */
  transition: number
}

const DEFAULT_TRANSITION = 7

/** A new entry: 10 seconds with WLED's default transition */
export const newPlaylistItem = (presetId: number): PlaylistItem => ({
  presetId,
  duration: 10,
  transition: DEFAULT_TRANSITION,
})

/**
 * Entry `i` of a stored per-entry value, as WLED reads it: a number applies to every entry and a
 * short array repeats its last value
 */
function entryValue(value: number | number[] | undefined, i: number): number | undefined {
  if (!Array.isArray(value)) return value
  return value.length > 0 ? value[Math.min(i, value.length - 1)] : undefined
}

/**
 * The editor's entries from a stored playlist (WLED stores durations in tenths of a second; a
 * duration of 0 holds the entry until it is advanced manually, and is kept)
 */
export function playlistToItems(playlist: WledPlaylist): PlaylistItem[] {
  return playlist.ps.map((presetId, i) => ({
    presetId,
    duration: (entryValue(playlist.dur, i) ?? 100) / 10,
    transition: entryValue(playlist.transition, i) ?? DEFAULT_TRANSITION,
  }))
}

/** The playlist to store for the editor's entries */
export function itemsToPlaylist(
  items: PlaylistItem[],
  { repeat, end }: { repeat: number; end: number },
): WledPlaylist {
  return {
    ps: items.map((item) => item.presetId),
    dur: items.map((item) => Math.round(item.duration * 10)),
    transition: items.map((item) => item.transition),
    repeat,
    end,
  }
}
