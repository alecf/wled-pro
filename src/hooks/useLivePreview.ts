import { useCallback, useEffect, useRef, useState } from 'react'
import { useControllerContext } from '@/contexts/ControllerContext'
import { segmentsToDeviceUpdate } from '@/lib/wled-state'
import type { Segment } from '@/types/wled'

/** What the device showed when the editor opened */
interface DeviceSnapshot {
  seg: Segment[]
  on: boolean
  bri: number
}

/**
 * The light show editor's link to the device: shows edits on it while live preview is on, and
 * puts back what it showed when the editor opened (live preview off, or Cancel).
 *
 * - `preview(segments)`: queue the segments if live preview is on (the editor's onSegmentsChange)
 * - `setLivePreview(enabled, segments)`: turn it on (showing `segments`) or off (restoring)
 * - `restore()`: put the device back, if this editor changed it
 * - `toDeviceSegments(segments)`: the `seg` update that makes the device's segments match,
 *   deleting segments the editor removed (for the save request)
 */
export function useLivePreview(initiallyEnabled: boolean) {
  const { state, queueUpdate } = useControllerContext()

  const [snapshot] = useState<DeviceSnapshot | null>(() =>
    state ? { seg: state.seg, on: state.on, bri: state.bri } : null,
  )
  const [isLivePreview, setIsLivePreview] = useState(initiallyEnabled)
  const isLivePreviewRef = useRef(isLivePreview)
  // Whether the device may differ from the snapshot because of this editor
  const deviceChangedRef = useRef(false)

  // Latest device segment IDs, so removed segments can be deleted on the device
  const deviceSegmentIdsRef = useRef<number[]>([])
  useEffect(() => {
    deviceSegmentIdsRef.current = state?.seg.map((s) => s.id) ?? []
  }, [state?.seg])
  // Segment IDs this editor has sent to the device as existing. `state` can lag
  // behind (or drop) a segment the editor just created, and a request that
  // deleted one may have failed, so ids are never forgotten: every update deletes
  // any of them the editor no longer has. Repeated deletes are harmless: WLED
  // ignores `stop: 0` for a slot that doesn't exist, and one for an inactive slot
  // only counts towards a purge, which can't renumber the kept ids `0..n-1`
  // (they're all active by then).
  const sentSegmentIdsRef = useRef<Set<number>>(new Set())

  const toDeviceSegments = useCallback((segs: Segment[]) => {
    const update = segmentsToDeviceUpdate(segs, [
      ...deviceSegmentIdsRef.current,
      ...sentSegmentIdsRef.current,
    ])
    for (const seg of update) {
      if (seg.id !== undefined && seg.stop !== 0) sentSegmentIdsRef.current.add(seg.id)
    }
    return update
  }, [])

  const apply = useCallback(
    (segs: Segment[]) => {
      deviceChangedRef.current = true
      queueUpdate({ seg: toDeviceSegments(segs) })
    },
    [queueUpdate, toDeviceSegments],
  )

  const preview = useCallback(
    (segs: Segment[]) => {
      if (isLivePreviewRef.current) apply(segs)
    },
    [apply],
  )

  const restore = useCallback(() => {
    if (!snapshot || !deviceChangedRef.current) return
    deviceChangedRef.current = false
    queueUpdate({ on: snapshot.on, bri: snapshot.bri, seg: toDeviceSegments(snapshot.seg) })
  }, [snapshot, queueUpdate, toDeviceSegments])

  const setLivePreview = useCallback(
    (enabled: boolean, segs: Segment[]) => {
      isLivePreviewRef.current = enabled
      setIsLivePreview(enabled)
      if (enabled) apply(segs)
      else restore()
    },
    [apply, restore],
  )

  return { isLivePreview, setLivePreview, preview, restore, toDeviceSegments }
}
