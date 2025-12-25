import type {
  GlobalSegment,
  SegmentGroup,
  SegmentStore,
  ValidationResult,
  FileSegmentStore,
  SyncMetadata,
} from '@/types/segments'
import type { WledApi } from '@/api/wled'

const STORAGE_KEY = 'wled-pro:segments'
const SYNC_META_KEY_PREFIX = 'wled-pro:segments:meta:'
const SEGMENTS_FILENAME = '/wled-pro-segments.json'

// ============================================================================
// Storage Operations
// ============================================================================

export function getSegments(controllerId: string): GlobalSegment[] {
  const json = localStorage.getItem(STORAGE_KEY)
  if (!json) return []

  try {
    const store: SegmentStore = JSON.parse(json)
    // Filter and sort for this controller
    return store.segments
      .filter((s) => s.controllerId === controllerId)
      .sort((a, b) => a.start - b.start)
  } catch {
    return []
  }
}

export function getGroups(controllerId: string): SegmentGroup[] {
  const json = localStorage.getItem(STORAGE_KEY)
  if (!json) return []

  try {
    const store: SegmentStore = JSON.parse(json)
    return store.groups.filter((g) => g.controllerId === controllerId)
  } catch {
    return []
  }
}

export function saveSegments(
  segments: GlobalSegment[],
  groups: SegmentGroup[]
): void {
  const store: SegmentStore = { segments, groups }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  // Note: notifyListeners() is NOT called here - hooks handle that
}

// ============================================================================
// File I/O Operations
// ============================================================================

/**
 * Read segments from WLED controller filesystem
 * @param api WledApi instance for the controller
 * @returns FileSegmentStore or null if file doesn't exist
 */
export async function readSegmentsFile(
  api: WledApi
): Promise<FileSegmentStore | null> {
  try {
    const data = await api.readJsonFile<FileSegmentStore>(SEGMENTS_FILENAME)
    return data
  } catch (error) {
    console.error('Failed to read segments file:', error)
    throw error
  }
}

/**
 * Write segments to WLED controller filesystem
 * @param api WledApi instance for the controller
 * @param store Segments and groups to write
 * @param controllerId Controller ID (for metadata)
 */
export async function writeSegmentsFile(
  api: WledApi,
  store: SegmentStore,
  controllerId: string
): Promise<void> {
  const fileData: FileSegmentStore = {
    version: 1,
    controllerId,
    lastModified: Date.now(),
    segments: store.segments,
    groups: store.groups,
  }

  try {
    await api.writeJsonFile(SEGMENTS_FILENAME, fileData)
  } catch (error) {
    console.error('Failed to write segments file:', error)
    throw error
  }
}

/**
 * Get sync metadata for a controller
 */
export function getSyncMetadata(controllerId: string): SyncMetadata | null {
  const key = `${SYNC_META_KEY_PREFIX}${controllerId}`
  const json = localStorage.getItem(key)
  if (!json) return null

  try {
    return JSON.parse(json) as SyncMetadata
  } catch {
    return null
  }
}

/**
 * Update sync metadata for a controller
 */
export function updateSyncMetadata(
  controllerId: string,
  updates: Partial<SyncMetadata>
): void {
  const key = `${SYNC_META_KEY_PREFIX}${controllerId}`
  const existing = getSyncMetadata(controllerId) || {
    controllerId,
    lastKnownFileMtime: 0,
    lastSyncTimestamp: 0,
  }

  const updated: SyncMetadata = {
    ...existing,
    ...updates,
  }

  localStorage.setItem(key, JSON.stringify(updated))
}

/**
 * Check if file on controller was modified externally
 * @param api WledApi instance
 * @param controllerId Controller ID
 * @returns true if file was modified externally
 */
export async function hasFileConflict(
  api: WledApi,
  controllerId: string
): Promise<boolean> {
  try {
    const fileData = await readSegmentsFile(api)
    if (!fileData) return false // No file = no conflict

    const metadata = getSyncMetadata(controllerId)
    if (!metadata) return false // No metadata = first time

    // Check if file was modified after our last known state
    return fileData.lastModified > metadata.lastKnownFileMtime
  } catch {
    return false // Error reading file = no conflict
  }
}

// ============================================================================
// Listener Management for useSyncExternalStore
// ============================================================================

const listeners = new Set<() => void>()

export function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function notifyListeners() {
  listeners.forEach((listener) => listener())
}

// ============================================================================
// Validation Functions (Inlined)
// ============================================================================

export function validateSplitPosition(
  segment: GlobalSegment,
  position: number
): ValidationResult {
  // Must be within segment bounds
  if (position <= segment.start || position >= segment.stop) {
    return {
      valid: false,
      error: `Split position must be between ${segment.start + 1} and ${segment.stop - 1}`,
    }
  }

  // Must create segments of at least 1 LED
  if (position - segment.start < 1) {
    return { valid: false, error: 'Split would create empty segment (start)' }
  }

  if (segment.stop - position < 1) {
    return { valid: false, error: 'Split would create empty segment (end)' }
  }

  return { valid: true }
}

export function validateMerge(
  seg1: GlobalSegment,
  seg2: GlobalSegment
): ValidationResult {
  // Must be adjacent
  if (seg1.stop !== seg2.start && seg2.stop !== seg1.start) {
    return {
      valid: false,
      error: `Segments are not adjacent (gap from ${Math.min(seg1.stop, seg2.stop)} to ${Math.max(seg1.start, seg2.start)})`,
    }
  }

  return { valid: true }
}

// ============================================================================
// Split & Merge Operations
// ============================================================================

export function splitSegmentAtPosition(
  segments: GlobalSegment[],
  segmentId: string,
  position: number
): GlobalSegment[] {
  return segments.flatMap((segment) => {
    if (segment.id !== segmentId) return [segment]

    // Validate before splitting
    const validation = validateSplitPosition(segment, position)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Create two new segments
    return [
      {
        ...segment,
        id: crypto.randomUUID(),
        stop: position,
        name: segment.name, // Keep original name for first half
      },
      {
        ...segment,
        id: crypto.randomUUID(),
        start: position,
        name: `${segment.name} (2)`, // Add suffix for second half
      },
    ]
  })
}

export function mergeSegmentsByIds(
  segments: GlobalSegment[],
  id1: string,
  id2: string,
  newName: string
): GlobalSegment[] {
  const seg1 = segments.find((s) => s.id === id1)
  const seg2 = segments.find((s) => s.id === id2)

  if (!seg1 || !seg2) {
    throw new Error('One or both segments not found')
  }

  // Validate before merging
  const validation = validateMerge(seg1, seg2)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Determine which is first
  const [first, second] =
    seg1.start < seg2.start ? [seg1, seg2] : [seg2, seg1]

  // Create merged segment
  const merged: GlobalSegment = {
    id: crypto.randomUUID(),
    controllerId: first.controllerId,
    start: first.start,
    stop: second.stop,
    name: newName,
    groupId: first.groupId, // Inherit group from first segment
  }

  // Replace both segments with merged one
  return segments.filter((s) => s.id !== id1 && s.id !== id2).concat(merged)
}

// ============================================================================
// Group Management
// ============================================================================

export function createGroup(
  groups: SegmentGroup[],
  controllerId: string,
  name: string
): SegmentGroup[] {
  const newGroup: SegmentGroup = {
    id: crypto.randomUUID(),
    controllerId,
    name,
  }
  return [...groups, newGroup]
}

export function updateGroup(
  groups: SegmentGroup[],
  groupId: string,
  name: string
): SegmentGroup[] {
  return groups.map((g) => (g.id === groupId ? { ...g, name } : g))
}

export function deleteGroup(
  groups: SegmentGroup[],
  segments: GlobalSegment[],
  groupId: string
): { groups: SegmentGroup[]; segments: GlobalSegment[] } {
  // Remove group and unassign segments
  return {
    groups: groups.filter((g) => g.id !== groupId),
    segments: segments.map((s) =>
      s.groupId === groupId ? { ...s, groupId: undefined } : s
    ),
  }
}

export function assignSegmentToGroup(
  segments: GlobalSegment[],
  segmentId: string,
  groupId: string | undefined
): GlobalSegment[] {
  return segments.map((s) => (s.id === segmentId ? { ...s, groupId } : s))
}
