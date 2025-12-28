import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'
import { WledApi } from '@/api/wled'
import type { GlobalSegment, SegmentGroup, SyncStatus } from '@/types/segments'
import {
  readSegmentsFile,
  writeSegmentsFile,
  setSegments,
  hasLoadedSegments,
} from '@/lib/segmentDefinitions'
import { getControllers } from '@/lib/controllers'
import { useSaveOperation } from '@/contexts/ApiActivityContext'

export function useSegmentFileSync(controllerId: string) {
  const controllers = getControllers()
  const controller = useMemo(
    () => controllers.find((c) => c.url === controllerId),
    [controllers, controllerId]
  )
  const api = useMemo(
    () => (controller ? new WledApi(controller.url) : null),
    [controller]
  )

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    synced: true,
    pending: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { wrapSave } = useSaveOperation()

  // Debounced write function (500ms for quick feedback, still coalesces rapid changes)
  const debouncedWrite = useDebouncedCallback(
    async (segments: GlobalSegment[], groups: SegmentGroup[]) => {
      if (!api) return

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
    500
  )

  // Flush pending writes on unmount
  useEffect(() => {
    return () => {
      debouncedWrite.flush()
    }
  }, [debouncedWrite])

  // Load from file on mount (only if not already loaded)
  useEffect(() => {
    if (!api) return

    // Skip if already loaded for this controller
    if (hasLoadedSegments(controllerId)) {
      setIsLoading(false)
      return
    }

    async function loadFromFile() {
      try {
        const fileData = await readSegmentsFile(api!)
        if (fileData) {
          setSegments(controllerId, fileData.segments, fileData.groups)
        } else {
          // No file exists yet - initialize with empty
          setSegments(controllerId, [], [])
        }
      } catch {
        // Network error - initialize with empty for now
        setSegments(controllerId, [], [])
        toast.error('Failed to load segments from controller')
      } finally {
        setIsLoading(false)
      }
    }

    loadFromFile()
  }, [controllerId, api])

  // Reload segments from file
  const reloadFromFile = useCallback(async () => {
    if (!api) return

    try {
      const fileData = await readSegmentsFile(api)
      if (fileData) {
        setSegments(controllerId, fileData.segments, fileData.groups)
        toast.success('Segments reloaded from controller')
      }
    } catch {
      toast.error('Failed to reload segments from controller')
    }
  }, [api, controllerId])

  return { syncStatus, queueWrite: debouncedWrite, reloadFromFile, isLoading }
}
