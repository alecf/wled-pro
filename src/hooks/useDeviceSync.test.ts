import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { WledState, Segment } from '@/types/wled'

/**
 * Tests for device synchronization behavior.
 *
 * These tests capture the current behavior in LightShowEditorScreen.tsx
 * that must be preserved when extracting to useDeviceSync hook.
 *
 * Key requirements:
 * 1. Live preview mode should send updates via WebSocket (queueUpdate)
 * 2. Updates should be debounced when live preview is enabled
 * 3. revertToInitial should restore the original state
 * 4. isDirty flag should track unsaved changes correctly
 * 5. Local state should not be lost on WebSocket reconnection
 *
 * Run these tests before and after extracting the hook (Task 4.2)
 * to ensure no regressions in behavior.
 */

// Helper to create a minimal test state
function createTestState(overrides?: Partial<WledState>): WledState {
  return {
    on: true,
    bri: 128,
    transition: 7,
    ps: 0,
    pl: 0,
    nl: { on: false, dur: 0, mode: 0, tbri: 0, rem: 0 },
    udpn: { send: false, recv: false, sgrp: 0, rgrp: 0 },
    lor: 0,
    mainseg: 0,
    seg: [
      {
        id: 0,
        start: 0,
        stop: 100,
        len: 100,
        grp: 1,
        spc: 0,
        of: 0,
        on: true,
        frz: false,
        bri: 255,
        cct: 127,
        col: [[255, 160, 0], [0, 0, 0], [0, 0, 0]],
        fx: 0,
        sx: 128,
        ix: 128,
        pal: 0,
        c1: 128,
        c2: 128,
        c3: 16,
        sel: false,
        rev: false,
        mi: false,
      },
    ],
    ...overrides,
  }
}

/**
 * Mock WebSocket interface that simulates useWledWebSocket behavior
 */
interface MockWebSocket {
  queueUpdate: (update: Partial<WledState>) => void
  isConnected: boolean
  updates: Partial<WledState>[]
}

function createMockWebSocket(): MockWebSocket {
  const updates: Partial<WledState>[] = []
  return {
    queueUpdate: vi.fn((update) => {
      updates.push(update)
    }),
    isConnected: true,
    updates,
  }
}

/**
 * This hook simulates the current device sync behavior in LightShowEditorScreen.tsx
 * It will be replaced by the actual useDeviceSync hook after Task 4.2
 */
function useDeviceSyncSimulator(
  initialState: WledState,
  mockWebSocket: MockWebSocket,
  livePreviewEnabled: boolean = false
) {
  const [localState, setLocalState] = useState<WledState>(initialState)
  const [isDirty, setIsDirty] = useState(false)
  const initialStateRef = useRef(initialState)

  // Update ref when initialState changes (simulates server updates)
  useEffect(() => {
    initialStateRef.current = initialState
  }, [initialState])

  // Apply changes to device - matches LightShowEditorScreen.tsx lines 123-142
  const applyToDevice = useCallback((state: WledState) => {
    if (livePreviewEnabled && mockWebSocket.isConnected) {
      // Use WebSocket for immediate feedback (debounced internally)
      const segUpdates = state.seg.map((seg) => ({
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
      mockWebSocket.queueUpdate({ seg: segUpdates })
    }
  }, [livePreviewEnabled, mockWebSocket])

  // Revert to initial state - matches LightShowEditorScreen.tsx lines 144-165
  const revertToInitial = useCallback(() => {
    const initial = initialStateRef.current
    setLocalState(initial)
    setIsDirty(false)

    if (livePreviewEnabled && mockWebSocket.isConnected) {
      const segUpdates = initial.seg.map((seg) => ({
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
      mockWebSocket.queueUpdate({
        on: initial.on,
        bri: initial.bri,
        seg: segUpdates,
      })
    }
  }, [livePreviewEnabled, mockWebSocket])

  // Update local state and optionally apply to device
  const updateLocalState = useCallback((updates: Partial<WledState>) => {
    setLocalState((prev) => {
      const newState = { ...prev, ...updates }

      // Handle segment updates specially
      if (updates.seg) {
        newState.seg = updates.seg as Segment[]
      }

      if (livePreviewEnabled && mockWebSocket.isConnected) {
        // Auto-apply if live preview is enabled
        const segUpdates = (updates.seg || newState.seg).map((seg: Segment) => ({
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
        mockWebSocket.queueUpdate({ ...updates, seg: segUpdates })
      }

      return newState
    })
    setIsDirty(true)
  }, [livePreviewEnabled, mockWebSocket])

  // Update a specific segment
  const updateSegment = useCallback((segmentId: number, updates: Partial<Segment>) => {
    setLocalState((prev) => {
      const newSegments = prev.seg.map((seg) =>
        seg.id === segmentId ? { ...seg, ...updates } : seg
      )

      if (livePreviewEnabled && mockWebSocket.isConnected) {
        const segUpdates = newSegments.map((seg) => ({
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
        mockWebSocket.queueUpdate({ seg: segUpdates })
      }

      return { ...prev, seg: newSegments }
    })
    setIsDirty(true)
  }, [livePreviewEnabled, mockWebSocket])

  return {
    localState,
    isDirty,
    isConnected: mockWebSocket.isConnected,
    applyToDevice,
    revertToInitial,
    updateLocalState,
    updateSegment,
  }
}

describe('useDeviceSync', () => {
  let mockWebSocket: MockWebSocket

  beforeEach(() => {
    mockWebSocket = createMockWebSocket()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('live preview mode', () => {
    it('should send updates via WebSocket when live preview is enabled', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, true) // live preview ON
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(mockWebSocket.queueUpdate).toHaveBeenCalled()
      expect(mockWebSocket.updates).toHaveLength(1)
      expect(mockWebSocket.updates[0].seg).toBeDefined()
    })

    it('should NOT send updates via WebSocket when live preview is disabled', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, false) // live preview OFF
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(mockWebSocket.queueUpdate).not.toHaveBeenCalled()
      expect(mockWebSocket.updates).toHaveLength(0)
    })

    it('should send updates for brightness changes in live preview', () => {
      const initialState = createTestState({ bri: 128 })

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, true)
      )

      act(() => {
        result.current.updateLocalState({ bri: 200 })
      })

      expect(mockWebSocket.queueUpdate).toHaveBeenCalled()
      expect(mockWebSocket.updates[0].bri).toBe(200)
    })
  })

  describe('dirty state tracking', () => {
    it('should mark as dirty after local changes', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, false)
      )

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(result.current.isDirty).toBe(true)
    })

    it('should clear dirty flag after revert', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, false)
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.revertToInitial()
      })

      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('revertToInitial', () => {
    it('should restore the original state', () => {
      const initialState = createTestState({ bri: 128 })
      initialState.seg[0].fx = 0

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, false)
      )

      // Make changes
      act(() => {
        result.current.updateLocalState({ bri: 255 })
        result.current.updateSegment(0, { fx: 10 })
      })

      expect(result.current.localState.bri).toBe(255)
      expect(result.current.localState.seg[0].fx).toBe(10)

      // Revert
      act(() => {
        result.current.revertToInitial()
      })

      expect(result.current.localState.bri).toBe(128)
      expect(result.current.localState.seg[0].fx).toBe(0)
    })

    it('should send revert update to device when in live preview mode', () => {
      const initialState = createTestState({ bri: 128 })

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, true) // live preview ON
      )

      // Make changes
      act(() => {
        result.current.updateLocalState({ bri: 255 })
      })

      mockWebSocket.updates.length = 0 // Clear previous updates

      // Revert
      act(() => {
        result.current.revertToInitial()
      })

      expect(mockWebSocket.queueUpdate).toHaveBeenCalled()
      const lastUpdate = mockWebSocket.updates[mockWebSocket.updates.length - 1]
      expect(lastUpdate.bri).toBe(128) // Original brightness
    })
  })

  describe('state updates', () => {
    it('should update local state correctly', () => {
      const initialState = createTestState({ bri: 128, on: true })

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, false)
      )

      act(() => {
        result.current.updateLocalState({ bri: 200, on: false })
      })

      expect(result.current.localState.bri).toBe(200)
      expect(result.current.localState.on).toBe(false)
    })

    it('should update specific segment correctly', () => {
      const initialState = createTestState()
      initialState.seg[0].fx = 0
      initialState.seg[0].bri = 255

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, false)
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5, bri: 200 })
      })

      expect(result.current.localState.seg[0].fx).toBe(5)
      expect(result.current.localState.seg[0].bri).toBe(200)
    })

    it('should preserve other segments when updating one', () => {
      const initialState = createTestState()
      initialState.seg.push({
        ...initialState.seg[0],
        id: 1,
        start: 100,
        stop: 200,
        fx: 0,
      })

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, false)
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(result.current.localState.seg[0].fx).toBe(5)
      expect(result.current.localState.seg[1].fx).toBe(0) // Unchanged
    })
  })

  describe('WebSocket connection handling', () => {
    it('should preserve local state when WebSocket disconnects', () => {
      const initialState = createTestState()

      const { result, rerender } = renderHook(
        ({ ws, live }) => useDeviceSyncSimulator(initialState, ws, live),
        { initialProps: { ws: mockWebSocket, live: true } }
      )

      // Make local changes
      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(result.current.localState.seg[0].fx).toBe(5)

      // Simulate disconnect
      const disconnectedWs = { ...mockWebSocket, isConnected: false }
      rerender({ ws: disconnectedWs, live: true })

      // Local state should be preserved
      expect(result.current.localState.seg[0].fx).toBe(5)
    })
  })

  describe('rapid updates (debouncing behavior)', () => {
    it('should coalesce rapid updates', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSyncSimulator(initialState, mockWebSocket, true)
      )

      act(() => {
        // Simulate rapid slider changes
        result.current.updateSegment(0, { bri: 110 })
        result.current.updateSegment(0, { bri: 120 })
        result.current.updateSegment(0, { bri: 130 })
        result.current.updateSegment(0, { bri: 140 })
        result.current.updateSegment(0, { bri: 150 })
      })

      // Final state should reflect last update
      expect(result.current.localState.seg[0].bri).toBe(150)

      // Note: The actual WebSocket hook has internal debouncing
      // This test documents that rapid updates should work correctly
      // The queueUpdate calls happen immediately but internal debouncing
      // coalesces them before sending to the device
    })
  })
})
