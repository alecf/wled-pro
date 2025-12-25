import { useCallback, useSyncExternalStore } from 'react'
import type { GlobalSegment } from '@/types/segments'
import {
  getSegments,
  getGroups,
  saveSegments,
  subscribe,
  notifyListeners,
  splitSegmentAtPosition,
  mergeSegmentsByIds,
  createGroup,
  updateGroup,
  deleteGroup,
  assignSegmentToGroup,
} from '@/lib/segmentDefinitions'
import { useSegmentFileSync } from './useSegmentFileSync'

const STORAGE_KEY = 'wled-pro:segments'

function getSnapshot(controllerId: string) {
  // Return JSON string for useSyncExternalStore
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
  const { syncStatus, queueWrite } = useSegmentFileSync(controllerId)

  // ============================================================================
  // Segment Operations
  // ============================================================================

  const addSplitPoint = useCallback(
    (segmentId: string, position: number) => {
      const json = localStorage.getItem(STORAGE_KEY)
      const store = json
        ? JSON.parse(json)
        : { segments: [], groups: [] }

      const controllerSegments = store.segments.filter(
        (s: GlobalSegment) => s.controllerId === controllerId
      )
      const otherSegments = store.segments.filter(
        (s: GlobalSegment) => s.controllerId !== controllerId
      )

      const newSegments = splitSegmentAtPosition(
        controllerSegments,
        segmentId,
        position
      )
      const allSegments = [...otherSegments, ...newSegments]

      saveSegments(allSegments, store.groups)
      notifyListeners()

      // Queue file write
      queueWrite(allSegments, store.groups)
    },
    [controllerId, queueWrite]
  )

  const mergeSegments = useCallback(
    (id1: string, id2: string, newName: string) => {
      const json = localStorage.getItem(STORAGE_KEY)
      const store = json
        ? JSON.parse(json)
        : { segments: [], groups: [] }

      const controllerSegments = store.segments.filter(
        (s: GlobalSegment) => s.controllerId === controllerId
      )
      const otherSegments = store.segments.filter(
        (s: GlobalSegment) => s.controllerId !== controllerId
      )

      const newSegments = mergeSegmentsByIds(
        controllerSegments,
        id1,
        id2,
        newName
      )
      const allSegments = [...otherSegments, ...newSegments]

      saveSegments(allSegments, store.groups)
      notifyListeners()

      // Queue file write
      queueWrite(allSegments, store.groups)
    },
    [controllerId, queueWrite]
  )

  const renameSegment = useCallback(
    (id: string, name: string) => {
      const json = localStorage.getItem(STORAGE_KEY)
      const store = json
        ? JSON.parse(json)
        : { segments: [], groups: [] }

      const updated = store.segments.map((s: GlobalSegment) =>
        s.id === id ? { ...s, name } : s
      )

      saveSegments(updated, store.groups)
      notifyListeners()

      // Queue file write
      queueWrite(updated, store.groups)
    },
    [queueWrite]
  )

  const assignToGroup = useCallback(
    (segmentId: string, groupId: string | undefined) => {
      const json = localStorage.getItem(STORAGE_KEY)
      const store = json
        ? JSON.parse(json)
        : { segments: [], groups: [] }

      const controllerSegments = store.segments.filter(
        (s: GlobalSegment) => s.controllerId === controllerId
      )
      const otherSegments = store.segments.filter(
        (s: GlobalSegment) => s.controllerId !== controllerId
      )

      const updated = assignSegmentToGroup(
        controllerSegments,
        segmentId,
        groupId
      )
      const allSegments = [...otherSegments, ...updated]

      saveSegments(allSegments, store.groups)
      notifyListeners()

      // Queue file write
      queueWrite(allSegments, store.groups)
    },
    [controllerId, queueWrite]
  )

  // ============================================================================
  // Group Operations
  // ============================================================================

  const addGroup = useCallback(
    (name: string) => {
      const json = localStorage.getItem(STORAGE_KEY)
      const store = json
        ? JSON.parse(json)
        : { segments: [], groups: [] }

      const newGroups = createGroup(store.groups, controllerId, name)

      saveSegments(store.segments, newGroups)
      notifyListeners()

      // Queue file write
      queueWrite(store.segments, newGroups)
    },
    [controllerId, queueWrite]
  )

  const renameGroup = useCallback(
    (id: string, name: string) => {
      const json = localStorage.getItem(STORAGE_KEY)
      const store = json
        ? JSON.parse(json)
        : { segments: [], groups: [] }

      const newGroups = updateGroup(store.groups, id, name)

      saveSegments(store.segments, newGroups)
      notifyListeners()

      // Queue file write
      queueWrite(store.segments, newGroups)
    },
    [queueWrite]
  )

  const removeGroup = useCallback(
    (id: string) => {
      const json = localStorage.getItem(STORAGE_KEY)
      const store = json
        ? JSON.parse(json)
        : { segments: [], groups: [] }

      const { groups: newGroups, segments: newSegments } = deleteGroup(
        store.groups,
        store.segments,
        id
      )

      saveSegments(newSegments, newGroups)
      notifyListeners()

      // Queue file write
      queueWrite(newSegments, newGroups)
    },
    [queueWrite]
  )

  return {
    segments,
    groups,
    syncStatus,
    addSplitPoint,
    mergeSegments,
    renameSegment,
    assignToGroup,
    addGroup,
    renameGroup,
    removeGroup,
  }
}
