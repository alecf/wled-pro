import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { getWledApi } from '@/api/wled'
import {
  assignSegmentToGroup,
  createGroup,
  deleteGroup,
  mergeSegmentsByIds,
  readSegmentsFile,
  splitSegmentAtPosition,
  updateGroup,
  writeSegmentsFile,
} from '@/lib/segmentDefinitions'
import type { GlobalSegment, SegmentStore } from '@/types/segments'
import { getQueryKeys } from './useQueryKeys'

const sortByStart = (store: SegmentStore): SegmentStore => ({
  ...store,
  segments: [...store.segments].sort((a, b) => a.start - b.start),
})

// The failed read last toasted per controller, so each screen using the hook doesn't repeat it
const toastedLoadErrors = new Map<string, number>()

/**
 * A controller's global segments, stored in `/wled-pro-segments.json` on the controller.
 *
 * A missing file (404) is an empty layout; a failed read is `loadError`, and edits are ignored
 * until a read succeeds, so a write can never replace a layout that was never read. Each edit
 * updates the cache at once and writes the whole file (writes run one at a time, in order).
 */
export function useSegmentDefinitions(baseUrl: string) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => getQueryKeys(baseUrl).segmentsFile, [baseUrl])

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<SegmentStore> => {
      const file = await readSegmentsFile(getWledApi(baseUrl))
      return { segments: file?.segments ?? [], groups: file?.groups ?? [] }
    },
    staleTime: Infinity,
    select: sortByStart,
  })

  const write = useMutation({
    mutationFn: (store: SegmentStore) => writeSegmentsFile(getWledApi(baseUrl), store),
    // One controller's writes go out in order, so an older layout can't land last
    scope: { id: queryKey.join('|') },
    onError: (error) => {
      toast.error('Failed to sync segments to controller')
      console.error(error)
      // Show what the controller actually has
      queryClient.invalidateQueries({ queryKey })
    },
  })
  const { mutate } = write

  /** Apply a change to the cached layout and write it. Ignored until the file has been read. */
  const commit = useCallback(
    (change: (current: SegmentStore) => Partial<SegmentStore>) => {
      const current = queryClient.getQueryData<SegmentStore>(queryKey)
      if (!current) return
      // A read in flight started before this edit; its older file must not overwrite it
      queryClient.cancelQueries({ queryKey })
      const next = { ...current, ...change(sortByStart(current)) }
      queryClient.setQueryData(queryKey, next)
      mutate(next)
    },
    [queryClient, queryKey, mutate],
  )

  const { refetch } = query
  const reloadFromFile = useCallback(async () => {
    const result = await refetch()
    if (result.isSuccess) {
      toast.success('Segments reloaded from controller')
    } else {
      toast.error('Failed to reload segments from controller', { id: loadErrorToastId(baseUrl) })
    }
  }, [refetch, baseUrl])

  // A failed read (with nothing cached) is an error state; tell the user once per failure
  const loadFailed = query.isError && query.data === undefined
  const { errorUpdatedAt } = query
  useEffect(() => {
    if (!loadFailed || toastedLoadErrors.get(baseUrl) === errorUpdatedAt) return
    toastedLoadErrors.set(baseUrl, errorUpdatedAt)
    toast.error('Failed to load segments from controller', { id: loadErrorToastId(baseUrl) })
  }, [loadFailed, baseUrl, errorUpdatedAt])

  const segments = query.data?.segments
  const groups = query.data?.groups
  return {
    segments: useMemo(() => segments ?? [], [segments]),
    groups: useMemo(() => groups ?? [], [groups]),
    isLoading: query.isPending,
    /** Set when the file could not be read (and nothing is cached); edits are ignored until a reload succeeds */
    loadError: loadFailed ? (query.error?.message ?? 'Failed to load segments') : null,
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

const loadErrorToastId = (baseUrl: string) => `segments-load-error:${baseUrl}`
