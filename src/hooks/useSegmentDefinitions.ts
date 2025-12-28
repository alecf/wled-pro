import { useCallback, useSyncExternalStore } from 'react'
import {
  getSegments,
  getGroups,
  setSegments,
  subscribe,
  splitSegmentAtPosition,
  mergeSegmentsByIds,
  createGroup,
  updateGroup,
  deleteGroup,
  assignSegmentToGroup,
} from '@/lib/segmentDefinitions'
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
    () => getSnapshot(controllerId)
  )

  const { segments, groups } = JSON.parse(dataJson)

  // File sync integration
  const { syncStatus, queueWrite, isLoading } = useSegmentFileSync(controllerId)

  // ============================================================================
  // Segment Operations
  // ============================================================================

  const addSplitPoint = useCallback(
    (segmentId: string, position: number) => {
      const currentSegments = getSegments(controllerId)
      const currentGroups = getGroups(controllerId)

      const newSegments = splitSegmentAtPosition(
        currentSegments,
        segmentId,
        position
      )

      setSegments(controllerId, newSegments, currentGroups)

      // Queue file write
      queueWrite(newSegments, currentGroups)
    },
    [controllerId, queueWrite]
  )

  const mergeSegments = useCallback(
    (id1: string, id2: string, newName: string) => {
      const currentSegments = getSegments(controllerId)
      const currentGroups = getGroups(controllerId)

      const newSegments = mergeSegmentsByIds(
        currentSegments,
        id1,
        id2,
        newName
      )

      setSegments(controllerId, newSegments, currentGroups)

      // Queue file write
      queueWrite(newSegments, currentGroups)
    },
    [controllerId, queueWrite]
  )

  const renameSegment = useCallback(
    (id: string, name: string) => {
      const currentSegments = getSegments(controllerId)
      const currentGroups = getGroups(controllerId)

      const updated = currentSegments.map((s) =>
        s.id === id ? { ...s, name } : s
      )

      setSegments(controllerId, updated, currentGroups)

      // Queue file write
      queueWrite(updated, currentGroups)
    },
    [controllerId, queueWrite]
  )

  const assignToGroup = useCallback(
    (segmentId: string, groupId: string | undefined) => {
      const currentSegments = getSegments(controllerId)
      const currentGroups = getGroups(controllerId)

      const updated = assignSegmentToGroup(currentSegments, segmentId, groupId)

      setSegments(controllerId, updated, currentGroups)

      // Queue file write
      queueWrite(updated, currentGroups)
    },
    [controllerId, queueWrite]
  )

  // ============================================================================
  // Group Operations
  // ============================================================================

  const addGroup = useCallback(
    (name: string) => {
      const currentSegments = getSegments(controllerId)
      const currentGroups = getGroups(controllerId)

      const newGroups = createGroup(currentGroups, name)

      setSegments(controllerId, currentSegments, newGroups)

      // Queue file write
      queueWrite(currentSegments, newGroups)
    },
    [controllerId, queueWrite]
  )

  const renameGroup = useCallback(
    (id: string, name: string) => {
      const currentSegments = getSegments(controllerId)
      const currentGroups = getGroups(controllerId)

      const newGroups = updateGroup(currentGroups, id, name)

      setSegments(controllerId, currentSegments, newGroups)

      // Queue file write
      queueWrite(currentSegments, newGroups)
    },
    [controllerId, queueWrite]
  )

  const removeGroup = useCallback(
    (id: string) => {
      const currentSegments = getSegments(controllerId)
      const currentGroups = getGroups(controllerId)

      const { groups: newGroups, segments: newSegments } = deleteGroup(
        currentGroups,
        currentSegments,
        id
      )

      setSegments(controllerId, newSegments, newGroups)

      // Queue file write
      queueWrite(newSegments, newGroups)
    },
    [controllerId, queueWrite]
  )

  // Initialize segments (used when creating first segment)
  const initializeSegments = useCallback(
    (newSegments: Parameters<typeof setSegments>[1]) => {
      const currentGroups = getGroups(controllerId)
      setSegments(controllerId, newSegments, currentGroups)
      queueWrite(newSegments, currentGroups)
    },
    [controllerId, queueWrite]
  )

  return {
    segments,
    groups,
    syncStatus,
    isLoading,
    initializeSegments,
    addSplitPoint,
    mergeSegments,
    renameSegment,
    assignToGroup,
    addGroup,
    renameGroup,
    removeGroup,
  }
}
