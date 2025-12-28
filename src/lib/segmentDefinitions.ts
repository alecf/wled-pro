import type {
  GlobalSegment,
  SegmentGroup,
  SegmentStore,
  ValidationResult,
  FileSegmentStore,
} from '@/types/segments'
import type { WledApi } from '@/api/wled'

const SEGMENTS_FILENAME = '/wled-pro-segments.json'

// ============================================================================
// In-Memory Store (keyed by controllerId)
// ============================================================================

const memoryStore = new Map<string, SegmentStore>()

export function getSegments(controllerId: string): GlobalSegment[] {
  const store = memoryStore.get(controllerId)
  if (!store) return []
  return [...store.segments].sort((a, b) => a.start - b.start)
}

export function getGroups(controllerId: string): SegmentGroup[] {
  const store = memoryStore.get(controllerId)
  if (!store) return []
  return store.groups
}

export function setSegments(
  controllerId: string,
  segments: GlobalSegment[],
  groups: SegmentGroup[]
): void {
  memoryStore.set(controllerId, { segments, groups })
  notifyListeners()
}

export function hasLoadedSegments(controllerId: string): boolean {
  return memoryStore.has(controllerId)
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
    // 404 means file doesn't exist yet - that's fine
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    console.error('Failed to read segments file:', error)
    throw error
  }
}

/**
 * Write segments to WLED controller filesystem
 * @param api WledApi instance for the controller
 * @param store Segments and groups to write
 */
export async function writeSegmentsFile(
  api: WledApi,
  store: SegmentStore
): Promise<void> {
  const fileData: FileSegmentStore = {
    version: 1,
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
// Validation Functions
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
  name: string
): SegmentGroup[] {
  const newGroup: SegmentGroup = {
    id: crypto.randomUUID(),
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
