# Codebase Reorganization Plan

## Overview

This plan organizes the WLED Pro codebase for improved maintainability, developer experience, and agent-based development acceleration. The work focuses on consolidating duplicated patterns, breaking apart large files, standardizing conventions, and improving documentation.

**Constraints:**
- No functionality changes beyond fixing edge cases discovered during refactoring
- All existing tests must continue to pass
- WebSocket and real-time sync behavior must remain intact

---

## Problem Statement / Motivation

The WLED Pro codebase has evolved organically and needs architectural attention to:
1. **Reduce code duplication** - Header and loading patterns duplicated across 4+ screens
2. **Improve navigation** - Large files (600+ lines) are difficult to understand and maintain
3. **Standardize conventions** - Query keys, screen props, and safe area handling are inconsistent
4. **Accelerate development** - Updated CLAUDE.md files will help agents understand the codebase faster

---

## Proposed Solution

A phased approach that prioritizes low-risk, high-impact changes first:

1. **Phase 1: Discovery & Audit** - Document current state before making changes
2. **Phase 2: Component Extraction** - Extract shared UI patterns
3. **Phase 3: Hook Refactoring** - Split large hooks into logical units
4. **Phase 4: Component Decomposition** - Break apart large screen components
5. **Phase 5: Documentation** - Update CLAUDE.md and add subdirectory documentation

---

## Technical Approach

### Phase 0: Critical Issue Prevention & Test Coverage

Before any refactoring, add tests for current behavior to prevent regressions. The code review identified these critical technical issues that must be addressed:

#### Task 0.1: Fix Type Name in Plan

**Issue:** Plan uses `WledSegment` but the codebase uses `Segment` from `src/types/wled.ts`.

**Action:** All proposed interfaces must use the correct type `Segment`, not `WledSegment`.

#### Task 0.2: Add Tests for Segment Operations (Before Task 4.1)

**Issue:** The proposed `useSegmentOperations` hook could introduce stale closure bugs. The current `LightShowEditorScreen.tsx` uses `setEditorState` with a callback form to avoid stale closures.

**Current working pattern (LightShowEditorScreen.tsx lines 177-192):**
```tsx
const updateSegment = useCallback(
  (segmentId: number, updates: Partial<Segment>) => {
    setEditorState((prev) => {
      const newSegments = prev.localSegments.map((seg) =>
        seg.id === segmentId ? { ...seg, ...updates } : seg,
      );
      // ...
      return { ...prev, localSegments: newSegments };
    });
  },
  [isLivePreview, applyToDevice],
);
```

**Tests to add before refactoring (`src/hooks/useSegmentOperations.test.ts`):**
- [ ] Test that `updateSegment` updates the correct segment by ID
- [ ] Test that `updateSegment` preserves other segments unchanged
- [ ] Test that `mergeSegments` combines segment ranges correctly
- [ ] Test that `splitSegment` creates two segments at the split point
- [ ] Test that `deleteSegment` removes the correct segment
- [ ] Test that rapid successive calls don't suffer from stale closure (use fake timers)
- [ ] Test that callbacks receive the latest state, not stale state

**Fix for proposed hook:** The hook must use a ref or state updater pattern to avoid stale closures:
```tsx
export function useSegmentOperations({
  initialSegments,
  ledCount,
  onSegmentsChange
}: UseSegmentOperationsOptions) {
  const [segments, setSegments] = useState(initialSegments);
  const segmentsRef = useRef(segments);
  segmentsRef.current = segments;

  const updateSegment = useCallback((id: number, updates: Partial<Segment>) => {
    setSegments((prev) => {
      const newSegments = prev.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      );
      onSegmentsChange?.(newSegments);
      return newSegments;
    });
  }, [onSegmentsChange]);

  // ... other operations use setSegments callback form
}
```

#### Task 0.3: Add Tests for Device Sync with WebSocket (Before Task 4.2)

**Issue:** The proposed `useDeviceSync` hook ignores the existing WebSocket integration. The current `LightShowEditorScreen.tsx` uses `useWledWebSocket` which provides `queueUpdate` for debounced, optimistic updates.

**Current working pattern (LightShowEditorScreen.tsx lines 66, 123-142):**
```tsx
const { state, info, queueUpdate } = useWledWebSocket(baseUrl);

const applyToDevice = useCallback(
  (segs: Segment[]) => {
    queueUpdate({ seg: segUpdates });  // Uses WebSocket's debounced queue
  },
  [queueUpdate],
);
```

**Tests to add before refactoring (`src/hooks/useDeviceSync.test.ts`):**
- [ ] Test that live preview mode sends updates via WebSocket (not HTTP)
- [ ] Test that updates are debounced when live preview is enabled
- [ ] Test that `revertToInitial` restores the original state
- [ ] Test that `isDirty` flag tracks unsaved changes correctly
- [ ] Test that WebSocket reconnection doesn't lose local state
- [ ] Test that rapid updates are coalesced (not sent individually)

**Fix for proposed hook:** Must integrate with `useWledWebSocket` instead of `useSetWledState`:
```tsx
export function useDeviceSync({
  baseUrl,
  initialState,
  livePreviewEnabled = false
}: UseDeviceSyncOptions) {
  const [localState, setLocalState] = useState(initialState);
  const [isDirty, setIsDirty] = useState(false);
  const { queueUpdate } = useWledWebSocket(baseUrl);
  const setStateMutation = useSetWledState(baseUrl);

  const applyToDevice = useCallback(async () => {
    if (!localState) return;
    if (livePreviewEnabled) {
      // Use WebSocket for immediate feedback
      queueUpdate(localState);
    } else {
      // Use HTTP for full state save
      await setStateMutation.mutateAsync(localState);
    }
    setIsDirty(false);
  }, [localState, livePreviewEnabled, queueUpdate, setStateMutation]);

  // ...
}
```

#### Task 0.4: Complete Query Key Audit (Before Task 3.1)

**Issue:** The query key audit is incomplete. `useWledWebSocket.ts` also constructs query keys directly.

**Files that construct query keys (must all be updated):**
- [ ] `src/hooks/useWled.ts:5-20` - `getQueryKeys()` function (source of truth)
- [ ] `src/hooks/usePresets.ts` - `getPresetsQueryKey()`, `getStateQueryKey()`
- [ ] `src/hooks/useWledWebSocket.ts:115` - Direct key construction: `['wled', baseUrl, 'fullState']`

**Tests to add before refactoring (`src/hooks/useQueryKeys.test.ts`):**
- [ ] Test that all query key patterns match the centralized factory
- [ ] Test that `invalidateQueries` with centralized keys invalidates the correct data
- [ ] Test that `setQueryData` with centralized keys updates the correct cache entry
- [ ] Test that changing a preset invalidates related state queries

**Search commands to verify completeness:**
```bash
grep -r "queryKey" src/hooks/ src/components/
grep -r "invalidateQueries" src/
grep -r "setQueryData" src/
grep -rE "\['wled'," src/  # Find hardcoded key patterns
```

#### Task 0.5: Add Integration Tests for Current Editor Behavior

**Location:** `src/components/shows/LightShowEditorScreen.test.tsx`

Before decomposing the editor, capture its current behavior:
- [ ] Test loading current state mode
- [ ] Test loading preset mode
- [ ] Test segment update applies to device in live preview mode
- [ ] Test segment update does NOT apply to device when live preview disabled
- [ ] Test save creates/updates preset correctly
- [ ] Test revert restores initial state
- [ ] Test dirty state tracking across operations
- [ ] Test navigation back with unsaved changes shows confirmation

---

### Phase 1: Discovery & Audit

Before making changes, complete a thorough audit:

#### Task 1.1: Query Key Audit
- [ ] Search for all `queryKey` references across the codebase
- [ ] Search for all `invalidateQueries` and `setQueryData` calls
- [ ] Document the current key patterns:
  - `useWled.ts` uses `['wled', baseUrl, 'state']` pattern via `getQueryKeys()`
  - `usePresets.ts` uses `['wled', baseUrl, 'presets']` directly
- [ ] Identify all consumers of each query key pattern
- [ ] Create migration checklist for standardization

**Files to analyze:**
- `src/hooks/useWled.ts:5-20` - getQueryKeys() function
- `src/hooks/usePresets.ts` - separate key functions

#### Task 1.2: LightShowEditor State Analysis
- [ ] Document all useState/useReducer calls in `LightShowEditorScreen.tsx`
- [ ] Map state transitions (what events cause state changes)
- [ ] Identify logical groupings for hook extraction
- [ ] Document which pieces are reusable vs page-specific

**File to analyze:**
- `src/components/shows/LightShowEditorScreen.tsx` (691 lines)

#### Task 1.3: Pattern Audit
- [ ] Audit all Header patterns across screens
- [ ] Audit all loading state patterns
- [ ] Audit all safe area inset handling
- [ ] Document variations for each pattern

**Files to search:**
- All `*Screen.tsx` files
- `src/components/navigation/`

#### Task 1.4: WebSocket Dependency Mapping
- [ ] Document relationship between `useWledWebSocket` and other hooks
- [ ] Verify cleanup function behavior
- [ ] Identify any shared state between WebSocket and query hooks

**Files to analyze:**
- `src/hooks/useWledWebSocket.ts` (193 lines)
- `src/hooks/useWled.ts` (347 lines)

---

### Phase 2: Component Extraction

Extract shared UI patterns into reusable components.

#### Task 2.1: Extract PageHeader Component

**Location:** `src/components/common/PageHeader.tsx`

**Current duplicated pattern (found in 4+ screens):**
```tsx
<header
  className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
  style={{ paddingTop: 'env(safe-area-inset-top)' }}
>
  <div className="flex items-center justify-between h-14 px-4">
    <div className="flex items-center gap-2">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
    {actions}
  </div>
</header>
```

**Proposed API:**
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, onBack, actions, className }: PageHeaderProps) {
  // Implementation
}
```

**Files to update:**
- [ ] `src/components/shows/LightShowEditorScreen.tsx` - lines 672-691
- [ ] `src/components/shows/SegmentEditorScreen.tsx` - lines 245-262
- [ ] `src/components/effects/EffectsBrowserScreen.tsx`
- [ ] `src/components/palettes/PalettesBrowserScreen.tsx`

#### Task 2.2: Extract LoadingScreen Component

**Location:** `src/components/common/LoadingScreen.tsx`

**Current duplicated pattern:**
```tsx
<ScreenContainer className="p-4">
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
</ScreenContainer>
```

**Proposed API:**
```tsx
interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message, className }: LoadingScreenProps) {
  return (
    <ScreenContainer className={cn("p-4", className)}>
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </ScreenContainer>
  );
}
```

**Files to update:**
- [ ] `src/components/shows/PresetsScreen.tsx` - lines 64-71
- [ ] `src/components/schedules/SchedulesScreen.tsx` - lines 177-185
- [ ] `src/components/time-location/TimeLocationScreen.tsx` - lines 131-139
- [ ] Other screens with similar patterns

#### Task 2.3: Create useSafeAreaInsets Hook

**Location:** `src/hooks/useSafeAreaInsets.ts`

Consolidate safe area handling with a CSS custom property approach:

```tsx
// In global CSS or index.css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

// Hook provides type-safe access
export function useSafeAreaInsets() {
  return {
    top: 'var(--safe-area-top)',
    bottom: 'var(--safe-area-bottom)',
    left: 'var(--safe-area-left)',
    right: 'var(--safe-area-right)',
  };
}
```

**Files to update:**
- [ ] `src/components/navigation/TabBar.tsx` - line 38
- [ ] `src/components/navigation/ControllerHeader.tsx` - line 19
- [ ] `src/components/shows/LightShowEditorScreen.tsx` - lines 566, 681
- [ ] `src/components/shows/SegmentEditorScreen.tsx` - line 249

---

### Phase 3: Hook Refactoring

#### Task 3.1: Standardize Query Keys

Update `usePresets.ts` to use centralized query key pattern:

**Current (usePresets.ts):**
```tsx
const getPresetsQueryKey = (baseUrl: string) => ['wled', baseUrl, 'presets'] as const;
const getStateQueryKey = (baseUrl: string) => ['wled', baseUrl, 'state'] as const;
```

**Target:** Import and use `getQueryKeys` from `useWled.ts`:
```tsx
import { getQueryKeys } from './useWled';

// Then use getQueryKeys(baseUrl).presets instead of local function
```

**Files to update:**
- [ ] `src/hooks/usePresets.ts` - update to use centralized keys
- [ ] Verify all `invalidateQueries` calls still work
- [ ] Add tests for cache invalidation behavior

#### Task 3.2: Split useWled.ts by Domain

**Current:** `src/hooks/useWled.ts` (347 lines, 25+ hooks)

Group hooks by the WLED feature they interact with, keeping related queries and mutations together.

**Proposed structure:**
```
src/hooks/
├── useWledState.ts        # State queries + mutations (power, brightness, segments)
├── useWledEffects.ts      # Effects query + palette query (read-only, often used together)
├── useWledConfig.ts       # Config query + NTP query/mutation + nodes query
├── useWledTimers.ts       # Timers query + mutations
├── useQueryKeys.ts        # Centralized query key factory (shared by all)
├── useWledWebSocket.ts    # Keep as-is (connection management)
├── usePresets.ts          # Keep as-is (preset CRUD)
├── useControllers.ts      # Keep as-is (localStorage)
└── useSegmentDefinitions.ts # Keep as-is
```

**useQueryKeys.ts:**
```tsx
// Centralized query key factory used by all WLED hooks
export function getQueryKeys(baseUrl: string) {
  return {
    fullState: ['wled', baseUrl, 'fullState'] as const,
    state: ['wled', baseUrl, 'state'] as const,
    info: ['wled', baseUrl, 'info'] as const,
    effects: ['wled', baseUrl, 'effects'] as const,
    palettes: ['wled', baseUrl, 'palettes'] as const,
    config: ['wled', baseUrl, 'config'] as const,
    nodes: ['wled', baseUrl, 'nodes'] as const,
    timers: ['wled', baseUrl, 'timers'] as const,
    presets: ['wled', baseUrl, 'presets'] as const,
  };
}
```

**useWledState.ts (~150 lines):**
```tsx
// Core state operations - query and mutations together
import { getQueryKeys } from './useQueryKeys';

export function useWledFullState(baseUrl: string) { ... }
export function useWledState(baseUrl: string) { ... }
export function useWledInfo(baseUrl: string) { ... }
export function useSetWledState(baseUrl: string) { ... }
export function useTogglePower(baseUrl: string) { ... }
export function useSetBrightness(baseUrl: string) { ... }
export function useSetEffect(baseUrl: string) { ... }
export function useSetPalette(baseUrl: string) { ... }
export function useSetColor(baseUrl: string) { ... }
```

**useWledEffects.ts (~80 lines):**
```tsx
// Effects and palettes (read-only, often used together)
import { getQueryKeys } from './useQueryKeys';

export function useWledEffects(baseUrl: string) { ... }
export function useWledPalettes(baseUrl: string) { ... }
```

**useWledConfig.ts (~80 lines):**
```tsx
// Device configuration and network
import { getQueryKeys } from './useQueryKeys';

export function useWledConfig(baseUrl: string) { ... }
export function useWledNodes(baseUrl: string) { ... }
export function useWledNtp(baseUrl: string) { ... }
export function useSetNtp(baseUrl: string) { ... }
```

**useWledTimers.ts (~60 lines):**
```tsx
// Timer operations
import { getQueryKeys } from './useQueryKeys';

export function useWledTimers(baseUrl: string) { ... }
export function useSetTimer(baseUrl: string) { ... }
export function useDeleteTimer(baseUrl: string) { ... }
```

**Migration steps:**
- [ ] Create `src/hooks/useQueryKeys.ts` first
- [ ] Create new hook files, importing from useQueryKeys
- [ ] Update imports in consuming files (direct imports, no barrel files)
- [ ] Delete original `useWled.ts` once all consumers updated

---

### Phase 4: Component Decomposition

#### Task 4.1: Extract Segment Operations Hook

**Location:** `src/hooks/useSegmentOperations.ts`

Extract reusable segment manipulation logic that could be used anywhere segments are edited.

**CRITICAL:** Must use state updater callback pattern to avoid stale closures (see Task 0.2).

```tsx
import { Segment } from '@/types/wled';

interface UseSegmentOperationsOptions {
  initialSegments: Segment[];
  ledCount: number;
  onSegmentsChange?: (segments: Segment[]) => void;
}

export function useSegmentOperations({
  initialSegments,
  ledCount,
  onSegmentsChange
}: UseSegmentOperationsOptions) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);

  // All operations use setSegments callback form to avoid stale closures
  const updateSegment = useCallback((id: number, updates: Partial<Segment>) => {
    setSegments((prev) => {
      const newSegments = prev.map((seg) =>
        seg.id === id ? { ...seg, ...updates } : seg
      );
      onSegmentsChange?.(newSegments);
      return newSegments;
    });
  }, [onSegmentsChange]);

  const mergeSegments = useCallback((ids: number[]) => {
    setSegments((prev) => {
      // Merge logic using prev, not stale closure
      const toMerge = prev.filter(s => ids.includes(s.id));
      if (toMerge.length < 2) return prev;
      // ... merge implementation
      const newSegments = /* merged result */;
      onSegmentsChange?.(newSegments);
      return newSegments;
    });
  }, [onSegmentsChange]);

  const splitSegment = useCallback((id: number, splitPoint: number) => {
    setSegments((prev) => {
      // Split logic using prev and ledCount
      const newSegments = /* split result */;
      onSegmentsChange?.(newSegments);
      return newSegments;
    });
  }, [onSegmentsChange, ledCount]);

  const deleteSegment = useCallback((id: number) => {
    setSegments((prev) => {
      const newSegments = prev.filter(s => s.id !== id);
      onSegmentsChange?.(newSegments);
      return newSegments;
    });
  }, [onSegmentsChange]);

  const addSegment = useCallback((start: number, stop: number) => {
    setSegments((prev) => {
      const newId = Math.max(...prev.map(s => s.id), -1) + 1;
      const newSegments = [...prev, { id: newId, start, stop, /* defaults */ }];
      onSegmentsChange?.(newSegments);
      return newSegments;
    });
  }, [onSegmentsChange]);

  // Sync with external changes
  useEffect(() => {
    setSegments(initialSegments);
  }, [initialSegments]);

  return {
    segments,
    updateSegment,
    mergeSegments,
    splitSegment,
    deleteSegment,
    addSegment,
  };
}
```

This hook is reusable for:
- LightShowEditorScreen (editing current state or presets)
- Any future segment editing UI
- Potential global segment editor

#### Task 4.2: Extract Device Sync Hook

**Location:** `src/hooks/useDeviceSync.ts`

Extract device synchronization logic for live preview and state management.

**CRITICAL:** Must integrate with `useWledWebSocket` for live preview mode (see Task 0.3).

```tsx
import { WledState } from '@/types/wled';
import { useWledWebSocket } from './useWledWebSocket';
import { useSetWledState } from './useWledState';

interface UseDeviceSyncOptions {
  baseUrl: string;
  initialState: WledState;
  livePreviewEnabled?: boolean;
}

export function useDeviceSync({
  baseUrl,
  initialState,
  livePreviewEnabled = false
}: UseDeviceSyncOptions) {
  const [localState, setLocalState] = useState<WledState>(initialState);
  const [isDirty, setIsDirty] = useState(false);

  // WebSocket for live preview (debounced, optimistic)
  const { queueUpdate, isConnected } = useWledWebSocket(baseUrl);

  // HTTP mutation for full state saves
  const setStateMutation = useSetWledState(baseUrl);

  const applyToDevice = useCallback(async (stateToApply?: Partial<WledState>) => {
    const updates = stateToApply ?? localState;
    if (!updates) return;

    if (livePreviewEnabled && isConnected) {
      // Use WebSocket for immediate feedback (debounced internally)
      queueUpdate(updates);
    } else {
      // Use HTTP for full state save
      await setStateMutation.mutateAsync(updates);
    }
    setIsDirty(false);
  }, [localState, livePreviewEnabled, isConnected, queueUpdate, setStateMutation]);

  const revertToInitial = useCallback(() => {
    setLocalState(initialState);
    setIsDirty(false);
    if (livePreviewEnabled && isConnected) {
      // Revert device to initial state too
      queueUpdate(initialState);
    }
  }, [initialState, livePreviewEnabled, isConnected, queueUpdate]);

  const updateLocalState = useCallback((updates: Partial<WledState>) => {
    setLocalState(prev => ({ ...prev, ...updates }));
    setIsDirty(true);

    // Auto-apply if live preview is enabled
    if (livePreviewEnabled && isConnected) {
      queueUpdate(updates);
    }
  }, [livePreviewEnabled, isConnected, queueUpdate]);

  // Sync with external initialState changes
  useEffect(() => {
    setLocalState(initialState);
    setIsDirty(false);
  }, [initialState]);

  return {
    localState,
    isDirty,
    isApplying: setStateMutation.isPending,
    isConnected,
    applyToDevice,
    revertToInitial,
    updateLocalState,
  };
}
```

#### Task 4.3: Simplify LightShowEditorScreen

After extracting the above hooks, `LightShowEditorScreen.tsx` should reduce to ~300-350 lines containing:
- JSX rendering and layout
- Navigation handling (back, save, etc.)
- Dialog state for "Save As" dialog
- Composing the extracted hooks

**Updated structure:**
```tsx
function LightShowEditorScreen({ ... }) {
  // Compose smaller hooks
  const { localState, isDirty, applyToDevice, revertToInitial, updateLocalState } = useDeviceSync({
    baseUrl,
    initialState: presetState ?? currentState,
    enabled: mode === 'current',
  });

  const { updateSegment, mergeSegments, splitSegment, deleteSegment } = useSegmentOperations({
    segments: localState?.seg ?? [],
    onSegmentsChange: (seg) => updateLocalState({ seg }),
    ledCount: info?.leds?.count ?? 0,
  });

  // Dialog state
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);

  // Navigation
  const handleBack = () => { ... };
  const handleSave = () => { ... };

  // Render
  return (
    <div>
      <PageHeader title={title} onBack={handleBack} actions={...} />
      <SegmentList ... />
      <SaveAsDialog open={showSaveAsDialog} ... />
    </div>
  );
}
```

---

### Phase 5: Documentation Updates

#### Task 5.1: Update Root CLAUDE.md

Update the existing CLAUDE.md with:
- [ ] Updated project structure reflecting new organization
- [ ] Document the new hooks organization (by domain, not by query/mutation)
- [ ] Document shared components (`PageHeader`, `LoadingScreen`)
- [ ] Add section on safe area handling pattern
- [ ] Document query key conventions
- [ ] Add section on hook composition patterns

#### Task 5.2: Add Subdirectory CLAUDE.md Files

**src/hooks/CLAUDE.md:**
```markdown
# Hooks Directory

## Organization

Hooks are organized by domain/feature rather than by query vs mutation type.

### WLED API Hooks
- `useQueryKeys.ts` - Centralized query key factory (import this first)
- `useWledState.ts` - Core state: queries and mutations for power, brightness, segments
- `useWledEffects.ts` - Effects and palettes (read-only)
- `useWledConfig.ts` - Device config, NTP, and network nodes
- `useWledTimers.ts` - Timer CRUD operations

### Connection Hooks
- `useWledWebSocket.ts` - WebSocket connection with auto-reconnect

### Data Management Hooks
- `useControllers.ts` - Controller localStorage management
- `usePresets.ts` - Preset CRUD operations
- `useSegmentDefinitions.ts` - Global segment management

### UI Hooks
- `useSafeAreaInsets.ts` - Safe area CSS custom properties
- `useSegmentOperations.ts` - Segment manipulation (merge, split, delete)
- `useDeviceSync.ts` - Device state sync with dirty tracking

## Query Key Conventions

All WLED query keys follow the pattern: `['wled', baseUrl, resource]`

Import from `useQueryKeys.ts`:
```tsx
import { getQueryKeys } from './useQueryKeys';
const keys = getQueryKeys(baseUrl);
// keys.state, keys.effects, keys.palettes, etc.
```

## Import Pattern

Import hooks directly from their files (no barrel exports):
```tsx
import { useWledState, useSetBrightness } from '@/hooks/useWledState';
import { useWledEffects } from '@/hooks/useWledEffects';
```
```

**src/components/common/CLAUDE.md:**
```markdown
# Common Components

Shared UI components used across multiple features.

## Components

### PageHeader
Standard page header with title, back button, and optional actions.
```tsx
<PageHeader
  title="Edit Light Show"
  subtitle="Living Room"
  onBack={() => navigate(-1)}
  actions={<Button>Save</Button>}
/>
```

### LoadingScreen
Centered loading spinner with optional message.
```tsx
<LoadingScreen message="Loading presets..." />
```

### ColorSwatch
Displays a color preview square.

### PaletteColorStrip
Renders a gradient preview from palette data.

### SegmentRow
Displays a segment with LED count and effect preview.

## Import Pattern

Import components directly (no barrel exports):
```tsx
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingScreen } from '@/components/common/LoadingScreen';
```
```

**src/components/shows/CLAUDE.md:**
```markdown
# Light Shows (Presets)

Components for viewing and editing light show presets.

## Key Components

### PresetsScreen
Lists all presets with quick actions.

### LightShowEditorScreen
Full-featured editor for current state or presets.
Composes these hooks:
- `useDeviceSync` - Local state and device sync
- `useSegmentOperations` - Segment CRUD operations

### SegmentEditorScreen
Per-segment effect and color editing.

## Editor Modes

The LightShowEditorScreen has two modes:
- **current**: Editing live device state (changes can apply immediately via live preview)
- **preset**: Editing a saved preset (must save to persist)

## State Flow

1. Load initial state (current device state or preset)
2. User makes edits via `useSegmentOperations`
3. Changes tracked locally via `useDeviceSync`
4. Live preview applies changes to device (optional)
5. Save persists to device (current) or preset file
```

#### Task 5.3: Remove Debug Logs

- [ ] Remove or gate debug console.logs in `src/routes/_controller.tsx`
- [ ] Option: Create `src/lib/debug.ts` with environment-aware logging

```tsx
// src/lib/debug.ts
export const debug = import.meta.env.DEV
  ? (...args: unknown[]) => console.log('[WLED-Pro]', ...args)
  : () => {};
```

---

## Acceptance Criteria

### Functional Requirements
- [ ] All existing tests pass
- [ ] WebSocket connections work correctly
- [ ] Real-time state sync functions properly
- [ ] Cache invalidation works after query key standardization
- [ ] All screens render correctly with new shared components

### Non-Functional Requirements
- [ ] No file exceeds 400 lines (except type definitions)
- [ ] Query keys follow consistent `['wled', baseUrl, resource]` pattern
- [ ] All shared components have TypeScript prop types
- [ ] CLAUDE.md accurately reflects current structure
- [ ] No barrel export files (direct imports only)

### Test Coverage Requirements (Phase 0)
- [ ] `useSegmentOperations.test.ts` covers all segment operations
- [ ] `useSegmentOperations.test.ts` includes stale closure regression tests
- [ ] `useDeviceSync.test.ts` covers WebSocket integration
- [ ] `useDeviceSync.test.ts` covers debouncing behavior
- [ ] `useQueryKeys.test.ts` verifies cache invalidation patterns
- [ ] `LightShowEditorScreen.test.tsx` covers current editor behavior
- [ ] All Phase 0 tests pass after Phase 3 refactoring

### Quality Gates
- [ ] `npm run build` succeeds without warnings
- [ ] `npm run lint` passes
- [ ] `npm test` passes (including new Phase 0 tests)
- [ ] Manual testing of all screens completed

---

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Query key changes break cache | High | Medium | Thorough audit before changes; add tests (Task 0.4) |
| WebSocket hook split breaks connections | High | Low | Map dependencies first; test reconnect |
| Import path changes break build | Medium | Medium | Use IDE refactoring; verify build after each change |
| Large PR hard to review | Medium | High | Separate into logical commits; consider multiple PRs |
| **Stale closure bugs in useSegmentOperations** | High | High | Use state updater callback pattern; add tests first (Task 0.2) |
| **useDeviceSync ignores WebSocket** | High | High | Integrate with useWledWebSocket; add tests first (Task 0.3) |
| **Wrong type names (WledSegment vs Segment)** | Medium | Certain | Fix in plan before implementation (Task 0.1) |
| **Incomplete query key audit** | High | Medium | Run grep commands; include useWledWebSocket.ts (Task 0.4) |

---

## Implementation Order

Recommended execution order prioritizing test coverage first, then low-risk changes:

### Sprint 0: Critical Issue Prevention (MUST DO FIRST)
1. Fix type name: Use `Segment` not `WledSegment` throughout plan (Task 0.1)
2. Run query key audit commands to find all hardcoded keys (Task 0.4)
3. Add tests for current segment operations behavior (Task 0.2)
4. Add tests for current device sync/WebSocket behavior (Task 0.3)
5. Add integration tests for LightShowEditorScreen (Task 0.5)

### Sprint 1: Foundation
6. Complete Phase 1 (Discovery & Audit) - understand current state
7. Extract PageHeader component (Task 2.1)
8. Extract LoadingScreen component (Task 2.2)
9. Create useSafeAreaInsets hook (Task 2.3)

### Sprint 2: Hook Refactoring
10. Create useQueryKeys.ts (shared key factory)
11. Split useWled.ts by domain (Task 3.2)
12. Standardize query keys in usePresets.ts AND useWledWebSocket.ts (Task 3.1)

### Sprint 3: Component Decomposition
13. Extract useSegmentOperations hook using stale-closure-safe pattern (Task 4.1)
14. Extract useDeviceSync hook with WebSocket integration (Task 4.2)
15. Simplify LightShowEditorScreen (Task 4.3)
16. Verify all Sprint 0 tests still pass

### Sprint 4: Documentation
17. Update root CLAUDE.md (Task 5.1)
18. Add subdirectory CLAUDE.md files (Task 5.2)
19. Remove debug logs (Task 5.3)

---

## Success Metrics

- **Code organization**: No file >400 lines (currently: 1 file at 691 lines)
- **Duplication reduction**: Header pattern consolidated (currently: 4+ duplicates)
- **Documentation coverage**: CLAUDE.md files in all major directories
- **Test coverage**: Maintained at current level or improved

---

## References

### Internal References
- Current structure: `src/` directory
- Query key pattern: `src/hooks/useWled.ts:5-20`
- Large files: `src/components/shows/LightShowEditorScreen.tsx` (691 lines)
- Duplicated header: `src/components/shows/LightShowEditorScreen.tsx:672-691`

### External References
- React Query patterns: https://tanstack.com/query/latest/docs/framework/react
- React 19 best practices: https://react.dev/blog/2024/12/05/react-19
- shadcn/ui organization: https://ui.shadcn.com/docs

---

Generated with [Claude Code](https://claude.com/claude-code)
