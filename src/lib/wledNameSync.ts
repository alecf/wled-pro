import type { GlobalSegment } from '@/types/segments'
import type { Segment, WledStateUpdate } from '@/types/wled'

/**
 * WLED Name Sync Integration
 *
 * Syncs global segment definition names to WLED device segment.n property
 * Uses the WLED JSON API to update segment names.
 */

/**
 * Create a state update to sync segment names to WLED device
 * Returns a partial state update that can be sent to /json/state
 */
export function createNameSyncUpdate(
  activeSegments: Segment[],
  globalSegments: GlobalSegment[]
): WledStateUpdate {
  const segmentUpdates: Partial<Segment>[] = []

  for (const activeSegment of activeSegments) {
    // Find matching global definition
    const match = globalSegments.find(
      (global) =>
        global.start === activeSegment.start && global.stop === activeSegment.stop
    )

    if (match && match.name !== activeSegment.n) {
      // Need to update this segment's name
      segmentUpdates.push({
        id: activeSegment.id,
        n: match.name,
      })
    }
  }

  return {
    seg: segmentUpdates,
  }
}

/**
 * Check if any segments need name syncing
 * Returns true if there are segments with mismatched names
 */
export function needsNameSync(
  activeSegments: Segment[],
  globalSegments: GlobalSegment[]
): boolean {
  return activeSegments.some((activeSegment) => {
    const match = globalSegments.find(
      (global) =>
        global.start === activeSegment.start && global.stop === activeSegment.stop
    )
    return match && match.name !== activeSegment.n
  })
}

/**
 * Get list of segments that would be updated by name sync
 * Useful for showing preview before syncing
 */
export function getSegmentsToSync(
  activeSegments: Segment[],
  globalSegments: GlobalSegment[]
): Array<{
  id: number
  currentName: string | undefined
  newName: string
}> {
  const toSync: Array<{
    id: number
    currentName: string | undefined
    newName: string
  }> = []

  for (const activeSegment of activeSegments) {
    const match = globalSegments.find(
      (global) =>
        global.start === activeSegment.start && global.stop === activeSegment.stop
    )

    if (match && match.name !== activeSegment.n) {
      toSync.push({
        id: activeSegment.id,
        currentName: activeSegment.n,
        newName: match.name,
      })
    }
  }

  return toSync
}

/**
 * Sync segment names to WLED device via HTTP POST
 * Returns true if update was successful
 */
export async function syncSegmentNames(
  baseUrl: string,
  activeSegments: Segment[],
  globalSegments: GlobalSegment[]
): Promise<boolean> {
  const update = createNameSyncUpdate(activeSegments, globalSegments)

  if (!update.seg || update.seg.length === 0) {
    // Nothing to sync
    return true
  }

  try {
    const response = await fetch(`${baseUrl}/json/state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    })

    return response.ok
  } catch (error) {
    console.error('Failed to sync segment names:', error)
    return false
  }
}
