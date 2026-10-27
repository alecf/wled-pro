import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useDebouncedCallback } from 'use-debounce'
import { WledApi } from '@/api/wled'
import { useSaveOperation } from '@/hooks/useApiActivity'
import {
  hasLoadedSegments,
  readSegmentsFile,
  setSegments,
  writeSegmentsFile,
} from '@/lib/segmentDefinitions'
import type { GlobalSegment, SegmentGroup, SyncStatus } from '@/types/segments'

export function useSegmentFileSync(controllerId: string) {
  // A controller's id is its URL
  const api = useMemo(() => new WledApi(controllerId), [controllerId])

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    synced: true,
    pending: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { wrapSave } = useSaveOperation()

  // Debounced write function (500ms for quick feedback, still coalesces rapid changes)
  const debouncedWrite = useDebouncedCallback(
    async (segments: GlobalSegment[], groups: SegmentGroup[]) => {
      setSyncStatus({ synced: false, pending: true })

      try {
        await wrapSave(() => writeSegmentsFile(api, { segments, groups }))
        setSyncStatus({ synced: true, pending: false, lastSyncTime: Date.now() })
      } catch (error) {
        setSyncStatus({
          synced: false,
          pending: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        toast.error('Failed to sync segments to controller')
      }
    },
    500,
  )

  // Flush pending writes on unmount
  useEffect(() => {
    return () => {
      debouncedWrite.flush()
    }
  }, [debouncedWrite])

  const [loadError, setLoadError] = useState<string | null>(null)

  /**
   * Read the file into the store. A missing file is an empty layout; a failed read leaves
   * the store unloaded (so nothing can overwrite the saved file) and sets `loadError`.
   */
  const loadFromFile = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const fileData = await readSegmentsFile(api)
      setSegments(controllerId, fileData?.segments ?? [], fileData?.groups ?? [])
      return true
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unknown error')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [api, controllerId])

  // Load from file on mount (only if not already loaded)
  useEffect(() => {
    if (hasLoadedSegments(controllerId)) {
      setIsLoading(false)
      return
    }
    loadFromFile().then((loaded) => {
      if (!loaded) toast.error('Failed to load segments from controller')
    })
  }, [controllerId, loadFromFile])

  // Reload segments from file
  const reloadFromFile = useCallback(async () => {
    if (await loadFromFile()) {
      toast.success('Segments reloaded from controller')
    } else {
      toast.error('Failed to reload segments from controller')
    }
  }, [loadFromFile])

  return { syncStatus, queueWrite: debouncedWrite, reloadFromFile, isLoading, loadError }
}
