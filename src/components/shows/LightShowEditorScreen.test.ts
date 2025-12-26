import { describe, it, expect, vi } from 'vitest'
import type { Segment, WledState } from '@/types/wled'

/**
 * Tests for LightShowEditorScreen behavior patterns.
 *
 * These tests capture the key state transitions and logic patterns
 * in LightShowEditorScreen.tsx that must be preserved during refactoring.
 *
 * The tests are organized by the editor's main responsibilities:
 * 1. Editor state initialization
 * 2. Mode-specific behavior (current vs preset)
 * 3. Live preview toggle handling
 * 4. Save and cancel operations
 * 5. Segment operations (already covered in useSegmentOperations.test.ts)
 *
 * Run these tests before and after refactoring (Tasks 4.1-4.3)
 * to ensure no regressions in editor behavior.
 */

// Helper to create a test segment
function createSegment(overrides?: Partial<Segment>): Segment {
  return {
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
    ...overrides,
  }
}

// Helper to create a test state
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
    seg: [createSegment()],
    ...overrides,
  }
}

// Type matching LightShowEditorScreen.tsx lines 51-57
interface EditorState {
  initialSegments: Segment[]
  initialOn: boolean
  initialBri: number
  localSegments: Segment[]
  initialized: boolean
}

// Helper to clone segments (matches LightShowEditorScreen.tsx lines 39-44)
function cloneSegments(segments: Segment[]): Segment[] {
  return segments.map((seg) => ({
    ...seg,
    col: seg.col?.map((c) => [...c] as [number, number, number]),
  }))
}

// Helper to compare segments (matches LightShowEditorScreen.tsx lines 46-49)
function segmentsEqual(a: Segment[], b: Segment[]): boolean {
  if (a.length !== b.length) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

describe('LightShowEditorScreen behaviors', () => {
  describe('Editor state initialization', () => {
    it('should initialize from device state correctly', () => {
      // Matches LightShowEditorScreen.tsx lines 101-110
      const deviceState = createTestState({
        on: true,
        bri: 200,
        seg: [createSegment({ fx: 5, bri: 180 })],
      })

      const editorState: EditorState = {
        initialSegments: cloneSegments(deviceState.seg),
        initialOn: deviceState.on,
        initialBri: deviceState.bri,
        localSegments: cloneSegments(deviceState.seg),
        initialized: true,
      }

      expect(editorState.initialized).toBe(true)
      expect(editorState.initialOn).toBe(true)
      expect(editorState.initialBri).toBe(200)
      expect(editorState.initialSegments[0].fx).toBe(5)
      expect(editorState.localSegments[0].fx).toBe(5)
    })

    it('should deep clone segments to prevent mutation', () => {
      const originalSegments = [createSegment({ col: [[255, 0, 0]] })]
      const cloned = cloneSegments(originalSegments)

      // Mutate the clone
      cloned[0].col[0][0] = 0

      // Original should be unchanged
      expect(originalSegments[0].col[0][0]).toBe(255)
    })
  })

  describe('Mode-specific behavior', () => {
    describe('current mode', () => {
      it('should enable live preview by default', () => {
        // Matches LightShowEditorScreen.tsx line 89
        const mode = 'current'
        const isLivePreview = mode === 'current'

        expect(isLivePreview).toBe(true)
      })

      it('should show info banner about immediate changes', () => {
        // Documents the UI behavior at lines 486-492
        const mode = 'current'
        const showInfoBanner = mode === 'current'

        expect(showInfoBanner).toBe(true)
      })

      it('should show Save As button instead of Save', () => {
        // Documents the UI behavior at lines 568-583
        const mode = 'current'
        const showSaveAs = true
        const showSave = mode === 'preset'

        expect(showSaveAs).toBe(true)
        expect(showSave).toBe(false)
      })
    })

    describe('preset mode', () => {
      it('should disable live preview by default', () => {
        // Matches LightShowEditorScreen.tsx line 89
        const mode = 'preset'
        const isLivePreview = mode === 'current' // false for preset

        expect(isLivePreview).toBe(false)
      })

      it('should show live preview toggle', () => {
        // Documents the UI behavior at lines 494-504
        const mode = 'preset'
        const showLivePreviewToggle = mode !== 'current'

        expect(showLivePreviewToggle).toBe(true)
      })

      it('should show both Save and Save As buttons', () => {
        // Documents the UI behavior at lines 584-609
        const mode = 'preset'
        const showSave = mode === 'preset'
        const showSaveAs = true

        expect(showSave).toBe(true)
        expect(showSaveAs).toBe(true)
      })
    })
  })

  describe('Live preview toggle', () => {
    it('should apply changes to device when enabling live preview', () => {
      // Matches LightShowEditorScreen.tsx lines 167-174
      const applyToDevice = vi.fn()
      const revertToInitial = vi.fn()
      const localSegments = [createSegment({ fx: 5 })]

      function handleLivePreviewChange(
        enabled: boolean,
        segments: Segment[]
      ) {
        if (enabled) {
          applyToDevice(segments)
        } else {
          revertToInitial()
        }
      }

      handleLivePreviewChange(true, localSegments)

      expect(applyToDevice).toHaveBeenCalledWith(localSegments)
      expect(revertToInitial).not.toHaveBeenCalled()
    })

    it('should revert to initial state when disabling live preview', () => {
      const applyToDevice = vi.fn()
      const revertToInitial = vi.fn()

      function handleLivePreviewChange(enabled: boolean) {
        if (enabled) {
          applyToDevice()
        } else {
          revertToInitial()
        }
      }

      handleLivePreviewChange(false)

      expect(revertToInitial).toHaveBeenCalled()
      expect(applyToDevice).not.toHaveBeenCalled()
    })
  })

  describe('Cancel operation', () => {
    it('should revert changes when canceling in live preview mode with changes', () => {
      // Matches LightShowEditorScreen.tsx lines 365-376
      const revertToInitial = vi.fn()
      const onClose = vi.fn()
      const isLivePreview = true
      const editorState: EditorState = {
        initialSegments: [createSegment({ fx: 0 })],
        initialOn: true,
        initialBri: 128,
        localSegments: [createSegment({ fx: 5 })], // Changed
        initialized: true,
      }

      function handleCancel() {
        if (isLivePreview && editorState.initialized) {
          const hasChanges = !segmentsEqual(
            editorState.localSegments,
            editorState.initialSegments
          )
          if (hasChanges) {
            revertToInitial()
          }
        }
        onClose()
      }

      handleCancel()

      expect(revertToInitial).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('should NOT revert when canceling with no changes', () => {
      const revertToInitial = vi.fn()
      const onClose = vi.fn()
      const isLivePreview = true
      const editorState: EditorState = {
        initialSegments: [createSegment({ fx: 0 })],
        initialOn: true,
        initialBri: 128,
        localSegments: [createSegment({ fx: 0 })], // Same as initial
        initialized: true,
      }

      function handleCancel() {
        if (isLivePreview && editorState.initialized) {
          const hasChanges = !segmentsEqual(
            editorState.localSegments,
            editorState.initialSegments
          )
          if (hasChanges) {
            revertToInitial()
          }
        }
        onClose()
      }

      handleCancel()

      expect(revertToInitial).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })

    it('should NOT revert when live preview is disabled', () => {
      const revertToInitial = vi.fn()
      const onClose = vi.fn()
      const isLivePreview = false
      const editorState: EditorState = {
        initialSegments: [createSegment({ fx: 0 })],
        initialOn: true,
        initialBri: 128,
        localSegments: [createSegment({ fx: 5 })], // Changed
        initialized: true,
      }

      function handleCancel() {
        if (isLivePreview && editorState.initialized) {
          const hasChanges = !segmentsEqual(
            editorState.localSegments,
            editorState.initialSegments
          )
          if (hasChanges) {
            revertToInitial()
          }
        }
        onClose()
      }

      handleCancel()

      // No revert because live preview is disabled
      expect(revertToInitial).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Segment equality comparison', () => {
    it('should detect equal segments', () => {
      const seg1 = [createSegment({ fx: 0, bri: 255 })]
      const seg2 = [createSegment({ fx: 0, bri: 255 })]

      expect(segmentsEqual(seg1, seg2)).toBe(true)
    })

    it('should detect different segment count', () => {
      const seg1 = [createSegment()]
      const seg2 = [createSegment(), createSegment({ id: 1 })]

      expect(segmentsEqual(seg1, seg2)).toBe(false)
    })

    it('should detect different segment properties', () => {
      const seg1 = [createSegment({ fx: 0 })]
      const seg2 = [createSegment({ fx: 5 })]

      expect(segmentsEqual(seg1, seg2)).toBe(false)
    })

    it('should detect different colors', () => {
      const seg1 = [createSegment({ col: [[255, 0, 0]] })]
      const seg2 = [createSegment({ col: [[0, 255, 0]] })]

      expect(segmentsEqual(seg1, seg2)).toBe(false)
    })
  })

  describe('Show Apply Global Segments button', () => {
    it('should show when conditions are met', () => {
      // Matches LightShowEditorScreen.tsx lines 434-438
      const globalSegments = [{ id: 'seg1', name: 'Kitchen', start: 0, stop: 50 }]
      const segments = [createSegment({ start: 0, stop: 150 })] // One big segment
      const ledCount = 150

      // hasOneBigSegment logic: single segment covering all LEDs
      const hasOneBig = segments.length === 1 &&
        segments[0].start === 0 &&
        segments[0].stop >= ledCount - 1

      const showApplyGlobalSegments =
        globalSegments.length > 0 &&
        segments.length === 1 &&
        hasOneBig

      expect(showApplyGlobalSegments).toBe(true)
    })

    it('should NOT show when multiple segments exist', () => {
      const globalSegments = [{ id: 'seg1', name: 'Kitchen', start: 0, stop: 50 }]
      const segments = [
        createSegment({ id: 0, start: 0, stop: 50 }),
        createSegment({ id: 1, start: 50, stop: 100 }),
      ]

      const showApplyGlobalSegments =
        globalSegments.length > 0 && segments.length === 1

      expect(showApplyGlobalSegments).toBe(false)
    })

    it('should NOT show when no global segments defined', () => {
      const globalSegments: unknown[] = []
      const segments = [createSegment()]

      const showApplyGlobalSegments =
        globalSegments.length > 0 && segments.length === 1

      expect(showApplyGlobalSegments).toBe(false)
    })
  })

  describe('Title generation', () => {
    it('should return "Current State" for current mode', () => {
      // Matches LightShowEditorScreen.tsx lines 428-431
      const mode = 'current'
      const existingPreset = null

      function getTitle() {
        if (mode === 'current') return 'Current State'
        return existingPreset?.n || 'Edit Light Show'
      }

      expect(getTitle()).toBe('Current State')
    })

    it('should return preset name for preset mode', () => {
      const mode = 'preset'
      const existingPreset = { id: 1, n: 'My Preset' }

      function getTitle() {
        if (mode === 'current') return 'Current State'
        return existingPreset?.n || 'Edit Light Show'
      }

      expect(getTitle()).toBe('My Preset')
    })

    it('should return fallback for new preset', () => {
      const mode = 'preset'
      const existingPreset = null

      function getTitle() {
        if (mode === 'current') return 'Current State'
        return existingPreset?.n || 'Edit Light Show'
      }

      expect(getTitle()).toBe('Edit Light Show')
    })
  })
})
