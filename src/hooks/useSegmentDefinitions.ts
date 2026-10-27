import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  assignSegmentToGroup,
  createGroup,
  deleteGroup,
  getGroups,
  getSegments,
  hasLoadedSegments,
  mergeSegmentsByIds,
  setSegments,
  splitSegmentAtPosition,
  subscribe,
  updateGroup,
} from '@/lib/segmentDefinitions'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'
import { useSegmentFileSync } from './useSegmentFileSync'

function getSnapshot(controllerId: string) {
  const segments = getSegments(controllerId)
  const groups = getGroups(controllerId)
  return JSON.stringify({ segments, groups })
}

export function useSegmentDefinitions(controllerId: string) {
  // Subscribe to changes
  const dataJson = useSyncExternalStore(
    subscribe,
    () => getSnapshot(controllerId),
    () => getSnapshot(controllerId),
  )

  const { segments, groups } = useMemo(
    () => JSON.parse(dataJson) as { segments: GlobalSegment[]; groups: SegmentGroup[] },
    [dataJson],
  )

  const { syncStatus, queueWrite, isLoading, loadError, reloadFromFile } =
    useSegmentFileSync(controllerId)

  /**
   * Apply a change to the stored segments/groups and queue a file write. Ignored until the
   * file has been read: writing before then would replace the saved layout.
   */
  const commit = useCallback(
    (
      change: (current: { segments: GlobalSegment[]; groups: SegmentGroup[] }) => {
        segments?: GlobalSegment[]
        groups?: SegmentGroup[]
      },
    ) => {
      if (!hasLoadedSegments(controllerId)) return
      const current = { segments: getSegments(controllerId), groups: getGroups(controllerId) }
      const next = { ...current, ...change(current) }
      setSegments(controllerId, next.segments, next.groups)
      queueWrite(next.segments, next.groups)
    },
    [controllerId, queueWrite],
  )

  return {
    segments,
    groups,
    syncStatus,
    isLoading,
    /** Set when the file could not be read; edits are ignored until a reload succeeds */
    loadError,
    reloadFromFile,
    /** Replace all segments (used when creating the first segment) */
    initializeSegments: useCallback(
      (newSegments: GlobalSegment[]) => commit(() => ({ segments: newSegments })),
      [commit],
    ),
    addSplitPoint: useCallback(
      (segmentId: string, position: number) =>
        commit((c) => ({ segments: splitSegmentAtPosition(c.segments, segmentId, position) })),
      [commit],
    ),
    mergeSegments: useCallback(
      (id1: string, id2: string, newName: string) =>
        commit((c) => ({ segments: mergeSegmentsByIds(c.segments, id1, id2, newName) })),
      [commit],
    ),
    renameSegment: useCallback(
      (id: string, name: string) =>
        commit((c) => ({ segments: c.segments.map((s) => (s.id === id ? { ...s, name } : s)) })),
      [commit],
    ),
    assignToGroup: useCallback(
      (segmentId: string, groupId: string | undefined) =>
        commit((c) => ({ segments: assignSegmentToGroup(c.segments, segmentId, groupId) })),
      [commit],
    ),
    addGroup: useCallback(
      (name: string) => commit((c) => ({ groups: createGroup(c.groups, name) })),
      [commit],
    ),
    renameGroup: useCallback(
      (id: string, name: string) => commit((c) => ({ groups: updateGroup(c.groups, id, name) })),
      [commit],
    ),
    removeGroup: useCallback(
      (id: string) => commit((c) => deleteGroup(c.groups, c.segments, id)),
      [commit],
    ),
  }
}
