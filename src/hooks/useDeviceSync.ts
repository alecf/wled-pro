import { useState, useCallback, useEffect, useRef } from 'react'
import type { WledState, Segment, WledStateUpdate } from '@/types/wled'
import { useWledWebSocket } from './useWledWebSocket'

export interface UseDeviceSyncOptions {
  baseUrl: string
  initialState: WledState
  livePreviewEnabled?: boolean
}

/**
 * Format segments for sending to device.
 * Only includes the properties that WLED accepts for segment updates.
 */
function formatSegmentsForDevice(segments: Segment[]) {
  return segments.map((seg) => ({
    id: seg.id,
    start: seg.start,
    stop: seg.stop,
    fx: seg.fx,
    sx: seg.sx,
    ix: seg.ix,
    pal: seg.pal,
    col: seg.col,
    bri: seg.bri,
    c1: seg.c1,
    c2: seg.c2,
    c3: seg.c3,
  }))
}

/**
 * Hook for synchronizing local state with a WLED device.
 *
 * Provides:
 * - Local state management with dirty tracking
 * - Live preview mode that sends updates via WebSocket
 * - Revert functionality to restore initial state
 *
 * This hook integrates with useWledWebSocket for debounced, optimistic updates
 * during live preview mode, which is critical for smooth slider interactions.
 */
export function useDeviceSync({
  baseUrl,
  initialState,
  livePreviewEnabled = false,
}: UseDeviceSyncOptions) {
  const [localState, setLocalState] = useState<WledState>(initialState)
  const [isDirty, setIsDirty] = useState(false)
  const initialStateRef = useRef(initialState)

  // WebSocket connection for live preview
  const { queueUpdate, isConnected } = useWledWebSocket(baseUrl, {
    enabled: livePreviewEnabled,
  })

  // Update ref when initialState changes (e.g., when loading a different preset)
  useEffect(() => {
    initialStateRef.current = initialState
    setLocalState(initialState)
    setIsDirty(false)
  }, [initialState])

  /**
   * Apply the current local state to the device.
   * In live preview mode, uses WebSocket for immediate feedback.
   */
  const applyToDevice = useCallback(
    (stateToApply?: WledState) => {
      const state = stateToApply ?? localState
      if (!state) return

      if (livePreviewEnabled && isConnected) {
        const segUpdates = formatSegmentsForDevice(state.seg)
        queueUpdate({ seg: segUpdates } as WledStateUpdate)
      }
    },
    [localState, livePreviewEnabled, isConnected, queueUpdate]
  )

  /**
   * Revert to the initial state.
   * In live preview mode, also sends the revert to the device.
   */
  const revertToInitial = useCallback(() => {
    const initial = initialStateRef.current
    setLocalState(initial)
    setIsDirty(false)

    if (livePreviewEnabled && isConnected) {
      const segUpdates = formatSegmentsForDevice(initial.seg)
      queueUpdate({
        on: initial.on,
        bri: initial.bri,
        seg: segUpdates,
      } as WledStateUpdate)
    }
  }, [livePreviewEnabled, isConnected, queueUpdate])

  /**
   * Update the local state and optionally apply to device.
   */
  const updateLocalState = useCallback(
    (updates: Partial<WledState>) => {
      setLocalState((prev) => {
        const newState = { ...prev, ...updates }

        // Handle segment updates specially
        if (updates.seg) {
          newState.seg = updates.seg as Segment[]
        }

        if (livePreviewEnabled && isConnected) {
          const segUpdates = formatSegmentsForDevice(updates.seg || newState.seg)
          queueUpdate({ ...updates, seg: segUpdates } as WledStateUpdate)
        }

        return newState
      })
      setIsDirty(true)
    },
    [livePreviewEnabled, isConnected, queueUpdate]
  )

  /**
   * Update a specific segment by ID.
   */
  const updateSegment = useCallback(
    (segmentId: number, updates: Partial<Segment>) => {
      setLocalState((prev) => {
        const newSegments = prev.seg.map((seg) =>
          seg.id === segmentId ? { ...seg, ...updates } : seg
        )

        if (livePreviewEnabled && isConnected) {
          const segUpdates = formatSegmentsForDevice(newSegments)
          queueUpdate({ seg: segUpdates } as WledStateUpdate)
        }

        return { ...prev, seg: newSegments }
      })
      setIsDirty(true)
    },
    [livePreviewEnabled, isConnected, queueUpdate]
  )

  return {
    localState,
    isDirty,
    isConnected,
    applyToDevice,
    revertToInitial,
    updateLocalState,
    updateSegment,
  }
}
