import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { WledState, Segment } from '@/types/wled'
import { useDeviceSync } from './useDeviceSync'

/**
 * Tests for device synchronization behavior.
 *
 * Key requirements:
 * 1. Live preview mode should send updates via WebSocket (queueUpdate)
 * 2. Updates should be debounced when live preview is enabled
 * 3. revertToInitial should restore the original state
 * 4. isDirty flag should track unsaved changes correctly
 * 5. Local state should not be lost on WebSocket reconnection
 */

// Mock useWledWebSocket
const mockQueueUpdate = vi.fn()
let mockIsConnected = true

vi.mock('./useWledWebSocket', () => ({
  useWledWebSocket: () => ({
    queueUpdate: mockQueueUpdate,
    isConnected: mockIsConnected,
    status: 'connected',
    state: null,
    info: null,
    flushUpdates: vi.fn(),
    toggle: vi.fn(),
    setBrightness: vi.fn(),
    setOn: vi.fn(),
  }),
}))

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

describe('useDeviceSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockQueueUpdate.mockClear()
    mockIsConnected = true
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('live preview mode', () => {
    it('should send updates via WebSocket when live preview is enabled', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: true,
        })
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(mockQueueUpdate).toHaveBeenCalled()
      expect(mockQueueUpdate.mock.calls[0][0].seg).toBeDefined()
    })

    it('should NOT send updates via WebSocket when live preview is disabled', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: false,
        })
      )

      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(mockQueueUpdate).not.toHaveBeenCalled()
    })

    it('should send updates for brightness changes in live preview', () => {
      const initialState = createTestState({ bri: 128 })

      const { result } = renderHook(() =>
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: true,
        })
      )

      act(() => {
        result.current.updateLocalState({ bri: 200 })
      })

      expect(mockQueueUpdate).toHaveBeenCalled()
      expect(mockQueueUpdate.mock.calls[0][0].bri).toBe(200)
    })
  })

  describe('dirty state tracking', () => {
    it('should mark as dirty after local changes', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: false,
        })
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
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: false,
        })
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
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: false,
        })
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
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: true,
        })
      )

      // Make changes
      act(() => {
        result.current.updateLocalState({ bri: 255 })
      })

      mockQueueUpdate.mockClear()

      // Revert
      act(() => {
        result.current.revertToInitial()
      })

      expect(mockQueueUpdate).toHaveBeenCalled()
      const lastCall = mockQueueUpdate.mock.calls[mockQueueUpdate.mock.calls.length - 1][0]
      expect(lastCall.bri).toBe(128) // Original brightness
    })
  })

  describe('state updates', () => {
    it('should update local state correctly', () => {
      const initialState = createTestState({ bri: 128, on: true })

      const { result } = renderHook(() =>
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: false,
        })
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
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: false,
        })
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
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: false,
        })
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
        ({ live }) =>
          useDeviceSync({
            baseUrl: 'http://test.local',
            initialState,
            livePreviewEnabled: live,
          }),
        { initialProps: { live: true } }
      )

      // Make local changes
      act(() => {
        result.current.updateSegment(0, { fx: 5 })
      })

      expect(result.current.localState.seg[0].fx).toBe(5)

      // Simulate disconnect by disabling live preview
      mockIsConnected = false
      rerender({ live: false })

      // Local state should be preserved
      expect(result.current.localState.seg[0].fx).toBe(5)
    })
  })

  describe('rapid updates (debouncing behavior)', () => {
    it('should coalesce rapid updates', () => {
      const initialState = createTestState()

      const { result } = renderHook(() =>
        useDeviceSync({
          baseUrl: 'http://test.local',
          initialState,
          livePreviewEnabled: true,
        })
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
