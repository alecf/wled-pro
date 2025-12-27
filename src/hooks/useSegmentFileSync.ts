import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'
import { WledApi } from '@/api/wled'
import type { GlobalSegment, SegmentGroup, SyncStatus } from '@/types/segments'
import {
  readSegmentsFile,
  writeSegmentsFile,
  getSegments,
  getGroups,
  saveSegments,
  notifyListeners,
  updateSyncMetadata,
  hasFileConflict,
} from '@/lib/segmentDefinitions'
import { getControllers } from '@/lib/controllers'

export function useSegmentFileSync(controllerId: string) {
  const controllers = getControllers()
  const controller = useMemo(
    () => controllers.find((c) => c.id === controllerId),
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

  // Reload segments from file (defined before useEffects that reference it)
  const reloadFromFile = useCallback(async () => {
    if (!api) return

    try {
      const fileData = await readSegmentsFile(api)
      if (fileData) {
        saveSegments(fileData.segments, fileData.groups)
        updateSyncMetadata(controllerId, {
          lastKnownFileMtime: fileData.lastModified,
          lastSyncTimestamp: Date.now(),
        })
        notifyListeners()
        toast.success('Segments reloaded from controller')
      }
    } catch {
      toast.error('Failed to reload segments from controller')
    }
  }, [api, controllerId])

  // Debounced write function (2s)
  const queueWrite = useDebouncedCallback(
    async (segments: GlobalSegment[], groups: SegmentGroup[]) => {
      if (!api) return

      setSyncStatus({ synced: false, pending: true })

      try {
        await writeSegmentsFile(api, { segments, groups }, controllerId)
        const now = Date.now()
        updateSyncMetadata(controllerId, {
          lastKnownFileMtime: now,
          lastSyncTimestamp: now,
        })
        setSyncStatus({ synced: true, pending: false, lastSyncTime: now })
      } catch (error) {
        setSyncStatus({
          synced: false,
          pending: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        toast.error('Failed to sync segments to controller')
      }
    },
    2000
  )

  // On mount: load from file, migrate if needed
  useEffect(() => {
    if (!api) return

    async function loadFromFile() {
      try {
        const fileData = await readSegmentsFile(api!)
        if (fileData) {
          // File exists - update localStorage cache
          saveSegments(fileData.segments, fileData.groups)
          updateSyncMetadata(controllerId, {
            lastKnownFileMtime: fileData.lastModified,
            lastSyncTimestamp: Date.now(),
          })
          notifyListeners()
        } else {
          // File doesn't exist (404) - migrate from localStorage
          const localSegments = getSegments(controllerId)
          const localGroups = getGroups(controllerId)
          if (localSegments.length > 0 || localGroups.length > 0) {
            // Immediate migration: write localStorage data to file
            await writeSegmentsFile(
              api!,
              { segments: localSegments, groups: localGroups },
              controllerId
            )
            updateSyncMetadata(controllerId, {
              lastKnownFileMtime: Date.now(),
              lastSyncTimestamp: Date.now(),
            })
          }
        }
      } catch {
        // Graceful fallback to localStorage (temporary until network restored)
      }
    }

    loadFromFile()
  }, [controllerId, api])

  // Periodic polling for multi-client changes (30s)
  useEffect(() => {
    if (!api || document.hidden) return

    const interval = setInterval(async () => {
      try {
        const conflict = await hasFileConflict(api!, controllerId)
        if (conflict) {
          // Show toast notification
          toast.info('Segments updated by another client', {
            action: { label: 'Reload', onClick: () => reloadFromFile() },
          })
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [controllerId, api, reloadFromFile])

  return { syncStatus, queueWrite, reloadFromFile }
}
