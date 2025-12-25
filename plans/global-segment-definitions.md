# Global Segment Split Point Management (v2 - Revised)

## Overview

Add a feature allowing users to define reusable segment templates ("global segments") for their LED controllers. Users can define split points once, name physical zones (e.g., "Lower roof", "Kitchen cabinets"), and optionally organize them into groups. The system automatically labels segments in light shows when they match global definitions, syncs names to WLED device, and provides snap-to-boundary functionality when splitting segments.

**Key Revisions from v1**:
- Simplified data model (removed color, order, version fields from MVP)
- Single localStorage key with simpler storage pattern
- Inlined validation and snap logic (no separate utility files)
- Fixed type safety issues (consistent SegmentLabel return type)
- Optimized auto-labeling performance (memoized sorting)
- Clarified WLED name syncing strategy (sync to device `n` property)
- Improved snap mode UX (better naming and UI)
- Kept groups feature (user requirement)

## Problem Statement

**Current Pain Point**: Users must manually define LED ranges every time they create a new preset. For fixed LED installations (roofline, cabinet lighting, room perimeter), the physical positions don't change, but users repeatedly enter the same split points and ranges across multiple light shows.

**Example Workflow Today**:
1. User creates "Rainbow effect" preset → manually splits at LED 100 → "Lower roof is 0-100, upper is 100-200"
2. User creates "Sparkle effect" preset → manually splits at LED 100 again → re-enters same ranges
3. User creates 10 more presets → repeats splitting at LED 100 each time

**Desired Workflow**:
1. User defines global segments ONCE: Split at 100 → Name: "Lower roof" (0-100), "Upper roof" (100-200)
2. User creates any preset → splits snap to LED 100 automatically → segments auto-labeled "Lower roof" and "Upper roof"
3. Names sync to WLED device → visible in native WLED UI too
4. User sees consistent naming across all presets and interfaces

## Proposed Solution

### Core Features

1. **Global Segment Definitions (Per-Controller)**
   - Define split points that create named LED ranges
   - Store definitions in localStorage tied to each controller
   - Persistent across sessions, independent of WLED device state

2. **Segment Naming System with WLED Sync**
   - User-provided names for each segment (e.g., "Kitchen", "Living room", "Hallway")
   - Auto-labeling engine that matches preset segments to global definitions
   - **Syncs names to WLED device's `n` property** - visible in native WLED UI
   - Combined labels for multi-segment spans (e.g., "Kitchen + Living room")

3. **Segment Groups**
   - Organize segments into collapsible groups (e.g., "Ground floor", "Outdoor")
   - Helps manage many segments in complex installations
   - UI-only organizational feature (no functional impact on presets)

4. **Snap-to-Boundary Mode in Light Show Editor**
   - Two-mode slider: Freeform (1-by-1 LED) or Snap (global boundaries only)
   - Visual indicators showing snap points
   - Preserves existing freeform capability for custom splits

5. **Automatic Label Application**
   - When creating/editing presets, segments matching globals get labeled
   - Real-time label updates as segments are split/merged
   - Graceful handling of non-matching segments (show LED range)

### UI Components

#### New "Segments" Tab (Per-Controller)
- Location: Controller detail view, new tab alongside existing tabs
- Visual: Similar to light show editor with LED strip visualization
- Actions: Split, Merge, Rename, Group assignment

#### Updated Light Show Editor
- Enhanced split screen with mode toggle (Freeform/Snap)
- Visual snap point indicators on slider
- Auto-label display on segment cards
- Preserved existing functionality (all current features remain)

## Technical Approach

### Data Model (Simplified)

```typescript
// src/types/segments.ts

interface GlobalSegment {
  id: string;              // UUID
  controllerId: string;    // Links to Controller.id
  start: number;           // LED index (inclusive)
  stop: number;            // LED index (exclusive)
  name: string;            // User-provided name
  groupId?: string;        // Optional group membership
}

interface SegmentGroup {
  id: string;
  controllerId: string;
  name: string;
}

interface SegmentStore {
  segments: GlobalSegment[];
  groups: SegmentGroup[];
}

// Consistent label type (no more string | object confusion)
interface SegmentLabel {
  display: string;         // What to show in UI
  tooltip?: string;        // Optional full text if truncated
}
```

**Changes from v1**:
- ❌ Removed `color` field (defer to V2)
- ❌ Removed `order` field (just sort by `start`)
- ❌ Removed `version` field (no migrations in V1)
- ❌ Removed `SegmentDefinitionsStore` wrapper
- ✅ Added consistent `SegmentLabel` type
- ✅ Simpler storage structure

### Storage Architecture (Simplified)

**Single localStorage Key** (simpler than per-controller keys):

```typescript
// src/lib/segmentDefinitions.ts

const STORAGE_KEY = 'wled-pro:segments';

export function getSegments(controllerId: string): GlobalSegment[] {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return [];

  const store: SegmentStore = JSON.parse(json);

  // Filter and sort for this controller
  return store.segments
    .filter(s => s.controllerId === controllerId)
    .sort((a, b) => a.start - b.start);
}

export function getGroups(controllerId: string): SegmentGroup[] {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return [];

  const store: SegmentStore = JSON.parse(json);
  return store.groups.filter(g => g.controllerId === controllerId);
}

export function saveSegments(segments: GlobalSegment[], groups: SegmentGroup[]): void {
  const store: SegmentStore = { segments, groups };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  // Note: notifyListeners() is NOT called here - hooks handle that
}

// Listener management for useSyncExternalStore
const listeners = new Set<() => void>();

export function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}
```

**Changes from v1**:
- ✅ Single storage key instead of `${prefix}${controllerId}`
- ✅ Removed `notifyListeners()` from storage functions (Kieran's fix)
- ✅ No version/migration logic
- ✅ Simpler data structure

### React Integration (Fixed Pattern)

```typescript
// src/hooks/useSegmentDefinitions.ts

export function useSegmentDefinitions(controllerId: string) {
  const segments = useSyncExternalStore(
    subscribe,
    () => getSegments(controllerId),
    () => getSegments(controllerId)
  );

  const groups = useSyncExternalStore(
    subscribe,
    () => getGroups(controllerId),
    () => getGroups(controllerId)
  );

  const addSplitPoint = useCallback((position: number) => {
    const allSegments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"segments":[],"groups":[]}').segments;
    const allGroups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"segments":[],"groups":[]}').groups;

    const newSegments = splitSegmentAtPosition(segments, position);
    const updated = allSegments
      .filter(s => s.controllerId !== controllerId)
      .concat(newSegments);

    saveSegments(updated, allGroups);
    notifyListeners(); // Hook calls this after save
  }, [controllerId, segments]);

  const mergeSegments = useCallback((id1: string, id2: string, newName: string) => {
    const allSegments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"segments":[],"groups":[]}').segments;
    const allGroups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"segments":[],"groups":[]}').groups;

    const newSegments = mergeSegmentsByIds(segments, id1, id2, newName);
    const updated = allSegments
      .filter(s => s.controllerId !== controllerId)
      .concat(newSegments);

    saveSegments(updated, allGroups);
    notifyListeners();
  }, [controllerId, segments]);

  const renameSegment = useCallback((id: string, name: string) => {
    const allSegments = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"segments":[],"groups":[]}').segments;
    const allGroups = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"segments":[],"groups":[]}').groups;

    const updated = allSegments.map(s =>
      s.id === id ? { ...s, name } : s
    );

    saveSegments(updated, allGroups);
    notifyListeners();
  }, [segments]);

  return {
    segments,
    groups,
    addSplitPoint,
    mergeSegments,
    renameSegment
  };
}
```

**Changes from v1**:
- ✅ Hooks call `notifyListeners()`, not storage functions
- ✅ Cleaner separation of concerns

### Auto-Labeling Algorithm (Optimized)

```typescript
// src/lib/segmentLabeling.ts

export function generateSegmentLabel(
  segment: Segment,
  globalSegments: GlobalSegment[]
): SegmentLabel {
  // Find all contiguous global segments that exactly match this segment
  const matchingGlobals = findExactMatches(segment, globalSegments);

  if (matchingGlobals.length === 0) {
    // No match - return LED range
    return { display: `LEDs ${segment.start}-${segment.stop}` };
  }

  if (matchingGlobals.length === 1) {
    // Single match
    return { display: matchingGlobals[0].name };
  }

  // Multiple matches - combine with " + "
  const names = matchingGlobals.map(g => g.name);
  const combined = names.join(' + ');

  // Truncate if too long
  if (combined.length > 30) {
    return {
      display: `${names[0]} + ${names.length - 1} more`,
      tooltip: combined
    };
  }

  return { display: combined };
}

// Memoize this outside component to avoid re-sorting on every render
function findExactMatches(
  segment: Segment,
  globals: GlobalSegment[]
): GlobalSegment[] {
  // Note: Caller should pre-sort globals using useMemo
  // to avoid sorting on every call

  const matches: GlobalSegment[] = [];
  let currentPos = segment.start;

  for (const global of globals) {
    if (currentPos >= segment.stop) break;

    if (global.start === currentPos) {
      matches.push(global);
      currentPos = global.stop;
    }
  }

  // Only return if we matched the full segment range exactly
  return currentPos === segment.stop ? matches : [];
}
```

**Usage in components (optimized)**:

```typescript
// In SegmentCard.tsx
function SegmentCard({ segment, controllerId }) {
  const { segments: globalSegments } = useSegmentDefinitions(controllerId);

  // OPTIMIZATION: Memoize sorted globals to avoid sorting on every render
  const sortedGlobals = useMemo(
    () => [...globalSegments].sort((a, b) => a.start - b.start),
    [globalSegments]
  );

  const label = useMemo(
    () => generateSegmentLabel(segment, sortedGlobals),
    [segment, sortedGlobals]
  );

  return (
    <div title={label.tooltip}>
      {label.display}
    </div>
  );
}
```

**Changes from v1**:
- ✅ Always returns `SegmentLabel` object (no string | object confusion)
- ✅ Caller pre-sorts globals with useMemo (performance fix)
- ✅ Uses HTML title attribute for tooltips (simpler than custom tooltip component)

### WLED Name Syncing Strategy

**Decision**: Sync global segment names to WLED device's `n` property

**Implementation**:

```typescript
// src/lib/wledNameSync.ts

export async function syncSegmentNamesToWLED(
  api: WledApi,
  segments: Segment[],
  globalSegments: GlobalSegment[]
): Promise<void> {
  const updates = segments.map(segment => {
    const label = generateSegmentLabel(segment, globalSegments);
    return {
      id: segment.id,
      n: label.display  // Set WLED's segment name property
    };
  });

  // Send updates to WLED
  await api.setState({ seg: updates });
}
```

**When to sync**:
1. When user saves a preset that uses global segments
2. When user renames a global segment (update all matching presets)
3. Optional: Auto-sync when viewing a controller with global segments defined

**Benefits**:
- Names persist on WLED device
- Visible in native WLED web UI and mobile apps
- Consistent naming across all interfaces
- Names survive WLED Pro cache clear

**Trade-offs**:
- Requires network call to update
- User could override names in native WLED UI (won't sync back to global segments)
- Acceptable: WLED Pro labels are source of truth, can re-sync if needed

### Validation (Inlined)

**No separate segmentValidation.ts file** - inline validation where needed:

```typescript
// In src/lib/segmentDefinitions.ts

export function validateSplitPosition(
  segment: GlobalSegment,
  position: number
): { valid: boolean; error?: string } {
  // Must be within segment bounds
  if (position <= segment.start || position >= segment.stop) {
    return {
      valid: false,
      error: `Split position must be between ${segment.start + 1} and ${segment.stop - 1}`
    };
  }

  // Must create segments of at least 1 LED
  if (position - segment.start < 1) {
    return { valid: false, error: 'Split would create empty segment (start)' };
  }

  if (segment.stop - position < 1) {
    return { valid: false, error: 'Split would create empty segment (end)' };
  }

  return { valid: true };
}

export function validateMerge(
  seg1: GlobalSegment,
  seg2: GlobalSegment
): { valid: boolean; error?: string } {
  // Must be adjacent
  if (seg1.stop !== seg2.start && seg2.stop !== seg1.start) {
    return {
      valid: false,
      error: `Segments are not adjacent (gap from ${seg1.stop} to ${seg2.start})`
    };
  }

  return { valid: true };
}
```

**Changes from v1**:
- ✅ No separate file - validation lives with storage logic
- ✅ Clear error messages
- ✅ ~40 LOC saved

### Snap-to-Boundary (Inlined & Improved UX)

**No separate segmentSnapping.ts file** - inline in component:

```typescript
// src/components/shows/SegmentSplitScreen.tsx

type SplitMode = 'snap' | 'freeform';  // Better naming than 'segment' | 'freeform'

function SegmentSplitScreen({ segment, onSplit, onCancel }) {
  const { segments: globalSegments } = useSegmentDefinitions(controllerId);
  const [mode, setMode] = useState<SplitMode>('freeform');  // Default to freeform
  const [splitPosition, setSplitPosition] = useState(
    Math.floor((segment.start + segment.stop) / 2)
  );

  // Calculate snap points from global definitions
  const snapPoints = useMemo(() => {
    return globalSegments
      .map(g => g.start)
      .filter(pos => pos > segment.start && pos < segment.stop);
  }, [globalSegments, segment]);

  // Sorted globals for labeling (memoized for performance)
  const sortedGlobals = useMemo(
    () => [...globalSegments].sort((a, b) => a.start - b.start),
    [globalSegments]
  );

  const handleSliderChange = (value: number) => {
    if (mode === 'snap' && snapPoints.length > 0) {
      // Snap to nearest boundary
      const nearest = snapPoints.reduce((prev, curr) =>
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      );
      setSplitPosition(nearest);
    } else {
      // Freeform mode - no snapping
      setSplitPosition(value);
    }
  };

  // Generate labels for preview
  const previewLabel1 = useMemo(
    () => generateSegmentLabel({ ...segment, stop: splitPosition }, sortedGlobals),
    [segment, splitPosition, sortedGlobals]
  );

  const previewLabel2 = useMemo(
    () => generateSegmentLabel({ ...segment, start: splitPosition }, sortedGlobals),
    [segment, splitPosition, sortedGlobals]
  );

  return (
    <div className="space-y-4">
      {/* Mode toggle - clearer labels */}
      <div className="flex items-center gap-2">
        <Label>Split mode:</Label>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={mode === 'freeform' ? 'default' : 'outline'}
            onClick={() => setMode('freeform')}
          >
            Precise
          </Button>
          <Button
            size="sm"
            variant={mode === 'snap' ? 'default' : 'outline'}
            onClick={() => setMode('snap')}
            disabled={snapPoints.length === 0}
          >
            Snap to boundaries
          </Button>
        </div>
      </div>

      {/* Slider with visual snap points */}
      <div className="relative pt-6">
        <Slider
          value={[splitPosition]}
          onValueChange={([v]) => handleSliderChange(v)}
          min={segment.start + 1}
          max={segment.stop - 1}
          step={1}
        />

        {/* Snap point markers */}
        {snapPoints.map(pos => (
          <div
            key={pos}
            className="absolute top-0 w-0.5 h-full bg-primary/50 pointer-events-none"
            style={{ left: `${((pos - segment.start) / (segment.stop - segment.start)) * 100}%` }}
          >
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-mono">
              {pos}
            </span>
          </div>
        ))}
      </div>

      {/* Preview cards with labels */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 border rounded-lg">
          <div className="text-xs text-muted-foreground">Segment 1</div>
          <div className="font-medium" title={previewLabel1.tooltip}>
            {previewLabel1.display}
          </div>
          <div className="text-xs text-muted-foreground">
            LEDs {segment.start}-{splitPosition}
          </div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-xs text-muted-foreground">Segment 2</div>
          <div className="font-medium" title={previewLabel2.tooltip}>
            {previewLabel2.display}
          </div>
          <div className="text-xs text-muted-foreground">
            LEDs {splitPosition}-{segment.stop}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSplit(splitPosition)}>Split</Button>
      </div>
    </div>
  );
}
```

**Changes from v1**:
- ✅ No separate file - snap logic inlined (~40 LOC saved)
- ✅ Better mode naming: `'snap' | 'freeform'` instead of `'segment' | 'freeform'`
- ✅ Button group instead of Switch (clearer UX)
- ✅ "Precise" and "Snap to boundaries" labels (more descriptive)
- ✅ Default to freeform mode (Kieran's suggestion)
- ✅ Preview cards integrated in same component

### Component Architecture (Streamlined)

**New Components**:

```
src/components/segments/
├── SegmentDefinitionsScreen.tsx   # Main tab content
├── SegmentDefinitionsList.tsx     # List with groups (collapsible)
├── SegmentDefinitionCard.tsx      # Individual segment item
├── SegmentVisualizer.tsx          # LED strip visualization
├── SegmentActionDialog.tsx        # Unified split/merge/group dialog
└── SegmentGroupSection.tsx        # Collapsible group accordion
```

**Modified Components**:

```
src/components/shows/
├── LightShowEditorScreen.tsx      # Add auto-labeling + name sync
├── SegmentCard.tsx                # Display labels (with tooltip)
├── SegmentSplitScreen.tsx         # Add snap mode (inlined logic)
└── SegmentList.tsx                # Show labels
```

**Shared Utilities** (consolidated):

```
src/lib/
├── segmentDefinitions.ts          # Storage + validation (all in one)
└── segmentLabeling.ts             # Auto-labeling algorithm only
```

**Changes from v1**:
- ❌ Removed `SegmentNameEditor.tsx` (inline in Card)
- ❌ Removed `SegmentGroupManager.tsx` (merged into ActionDialog)
- ❌ Removed `SnapModeToggle.tsx` (inline in SplitScreen)
- ❌ Removed `segmentValidation.ts` (moved to segmentDefinitions.ts)
- ❌ Removed `segmentSnapping.ts` (inlined in SplitScreen)
- ❌ Removed `SegmentSplitPreview.tsx` (merged into SplitScreen)
- ✅ Added unified `SegmentActionDialog.tsx`
- ✅ ~200 LOC reduction from fewer files

## Implementation Phases

### Phase 1: Foundation (Data Layer & Storage)

**Deliverables**:
- [ ] TypeScript type definitions (`src/types/segments.ts`)
- [ ] localStorage storage functions with validation (`src/lib/segmentDefinitions.ts`)
- [ ] React hook with useSyncExternalStore (`src/hooks/useSegmentDefinitions.ts`)
- [ ] Unit tests for storage and validation

**Acceptance Criteria**:
- Can save/load global segments per controller (single storage key)
- Changes trigger re-renders via useSyncExternalStore
- Data persists across browser sessions
- Validation prevents invalid states (overlaps, gaps, empty segments)
- Tests cover CRUD operations and edge cases

**Files to Create**:
```
src/types/segments.ts
src/lib/segmentDefinitions.ts       # Includes validation
src/hooks/useSegmentDefinitions.ts
src/lib/segmentDefinitions.test.ts
```

**Test Examples** (from Kieran's feedback):
```typescript
describe('validateSplitPosition', () => {
  it('rejects split at segment boundaries', () => {
    const segment = { id: '1', start: 0, stop: 100, name: 'Test' };
    expect(validateSplitPosition(segment, 0).valid).toBe(false);
    expect(validateSplitPosition(segment, 100).valid).toBe(false);
  });

  it('rejects split creating empty segment', () => {
    const segment = { id: '1', start: 0, stop: 2, name: 'Test' };
    expect(validateSplitPosition(segment, 1).valid).toBe(true);
    expect(validateSplitPosition(segment, 2).valid).toBe(false);
  });
});
```

### Phase 2: Segments Tab UI

**Deliverables**:
- [ ] SegmentDefinitionsScreen component (main tab content)
- [ ] SegmentDefinitionsList component (with group sections)
- [ ] SegmentDefinitionCard component (inline rename)
- [ ] SegmentVisualizer component (LED strip viz)
- [ ] SegmentGroupSection component (collapsible)
- [ ] Add "Segments" tab to navigation

**Acceptance Criteria**:
- Tab appears in controller detail view navigation
- Empty state shown when no segments defined
- Can view all global segments for current controller
- Visual LED strip shows segment boundaries and names
- Can rename segments inline (no separate component)
- Groups display as collapsible accordion sections

**Files to Create**:
```
src/components/segments/SegmentDefinitionsScreen.tsx
src/components/segments/SegmentDefinitionsList.tsx
src/components/segments/SegmentDefinitionCard.tsx
src/components/segments/SegmentVisualizer.tsx
src/components/segments/SegmentGroupSection.tsx
```

**Files to Modify**:
```
src/components/navigation/TabBar.tsx
src/App.tsx
```

### Phase 3: Split, Merge & Group Operations

**Deliverables**:
- [ ] Unified SegmentActionDialog for split/merge/group actions
- [ ] Segment manipulation utilities (in segmentDefinitions.ts)
- [ ] Merge name resolution UI
- [ ] Unit tests for split/merge logic

**Acceptance Criteria**:
- Can split any segment at any valid position
- Can merge adjacent segments (prompts for name choice)
- Validation prevents invalid states (enforced)
- Can create/delete/rename groups
- Can assign segments to groups
- Split/merge operations update localStorage
- UI updates reactively after operations
- Single dialog handles all actions (simpler UX)

**Files to Create**:
```
src/components/segments/SegmentActionDialog.tsx
```

**Files to Modify**:
```
src/lib/segmentDefinitions.ts                        # Add merge/split functions
src/components/segments/SegmentDefinitionsScreen.tsx
src/components/segments/SegmentDefinitionCard.tsx
```

### Phase 4: Auto-Labeling System

**Deliverables**:
- [ ] Auto-labeling algorithm (`src/lib/segmentLabeling.ts`)
- [ ] WLED name sync integration
- [ ] Integration with SegmentCard in light show editor
- [ ] Unit tests for matching logic with performance benchmarks

**Acceptance Criteria**:
- Preset segments matching globals show custom names
- Multi-segment spans show combined labels (e.g., "A + B + C")
- Non-matching segments show LED range fallback
- Labels update immediately when global segments change
- Labels truncate gracefully with tooltip (HTML title attribute)
- **Names sync to WLED device `n` property when saving presets**
- All edge cases tested and handled
- Performance: < 10ms for typical setups (verified with benchmarks)

**Files to Create**:
```
src/lib/segmentLabeling.ts
src/lib/segmentLabeling.test.ts
src/lib/wledNameSync.ts           # WLED sync logic
```

**Files to Modify**:
```
src/components/shows/SegmentCard.tsx
src/components/shows/SegmentList.tsx
src/components/shows/LightShowEditorScreen.tsx
src/types/wled.ts                 # Add n?: string if missing
```

### Phase 5: Snap-to-Boundary Mode

**Deliverables**:
- [ ] Snap mode UI with button group (inlined in SplitScreen)
- [ ] Visual snap point indicators on slider
- [ ] Preview of resulting labeled segments
- [ ] Integration with existing split screen

**Acceptance Criteria**:
- Button group switches between freeform and snap modes
- In snap mode, slider snaps only to global boundaries
- In freeform mode, slider moves 1 LED at a time (existing behavior)
- Visual markers show snap points on slider with LED numbers
- Preview cards show auto-generated labels before confirming split
- Default mode is freeform
- Snap button disabled when no global boundaries exist in range

**Files to Modify**:
```
src/components/shows/SegmentSplitScreen.tsx  # All logic inlined here
```

### Phase 6: Polish & Edge Cases

**Deliverables**:
- [ ] Mobile touch optimizations
- [ ] Keyboard navigation support
- [ ] Loading states and error handling
- [ ] Empty states with helpful prompts
- [ ] Tooltips and help text
- [ ] localStorage quota error handling

**Acceptance Criteria**:
- Touch targets meet minimum size (44px) on mobile
- All interactive elements keyboard accessible
- Graceful error handling for storage quota exceeded
- Empty states guide users to create first segment
- Tooltips explain snap mode and combined labels
- Screen reader announces segment names and actions

**Files to Modify**:
```
src/components/segments/SegmentDefinitionsScreen.tsx
src/components/segments/SegmentDefinitionCard.tsx
src/components/shows/SegmentSplitScreen.tsx
src/lib/segmentDefinitions.ts
```

## Acceptance Criteria

### Functional Requirements

**Global Segment Management**:
- [ ] User can navigate to "Segments" tab from controller detail view
- [ ] User can split the LED range at any position to create segments
- [ ] User can merge adjacent segments (prompts for name)
- [ ] User can name segments with custom text
- [ ] User can create/rename/delete groups
- [ ] User can assign segments to groups
- [ ] Segments persist in localStorage (single key)
- [ ] Changes sync across all tabs/components via useSyncExternalStore

**Auto-Labeling & WLED Sync**:
- [ ] Preset segments matching exactly one global segment show that name
- [ ] Preset segments matching multiple contiguous globals show combined name (e.g., "A + B")
- [ ] Preset segments not matching any globals show LED range (e.g., "LEDs 50-150")
- [ ] Labels update immediately when global segments are renamed
- [ ] Long combined labels truncate with tooltip (HTML title)
- [ ] **Names sync to WLED device `n` property when saving presets**
- [ ] Names visible in native WLED web UI and mobile apps

**Snap-to-Boundary**:
- [ ] User can switch between freeform and snap modes (button group)
- [ ] In snap mode, slider snaps only to global boundaries
- [ ] In freeform mode, slider moves 1 LED at a time (existing behavior)
- [ ] Visual indicators show snap points on slider
- [ ] Preview shows resulting segment labels before confirming split
- [ ] Default mode is freeform

### Non-Functional Requirements

**Performance**:
- [ ] Auto-labeling algorithm completes in < 10ms for typical setups (< 20 segments)
- [ ] Sorted globals memoized to avoid sorting on every render
- [ ] localStorage operations don't block UI
- [ ] Snap calculations don't cause slider lag

**Data Integrity**:
- [ ] No overlapping segments possible (validation enforced)
- [ ] Segments always sorted by start position
- [ ] Storage operations are atomic (save succeeds or fails, no partial writes)
- [ ] Validation prevents invalid split/merge operations

**Usability**:
- [ ] Touch targets minimum 44px on mobile
- [ ] Keyboard navigation works for all operations
- [ ] Screen reader announces segment names and actions
- [ ] Error messages are clear and actionable
- [ ] Empty states guide users to first action

**Compatibility**:
- [ ] Works with existing presets (doesn't break anything)
- [ ] Graceful degradation if localStorage unavailable
- [ ] Handles WLED devices without segment name support (< v0.13)

### Quality Gates

**Test Coverage**:
- [ ] Unit tests for all utility functions (segmentLabeling, split/merge)
- [ ] Performance benchmarks for auto-labeling
- [ ] Integration tests for storage operations
- [ ] Component tests for key interactions (split, merge, rename)
- [ ] Edge case tests (partial matches, empty state, validation)

**Code Review**:
- [ ] Follows existing patterns (useSyncExternalStore, localStorage keys)
- [ ] TypeScript strict mode with no `any` types
- [ ] Consistent naming conventions
- [ ] Comments for complex algorithms (auto-labeling)
- [ ] JSDoc on public functions

**Documentation**:
- [ ] Update CLAUDE.md with new feature overview
- [ ] Add JSDoc comments to public utility functions
- [ ] Include examples in component files

## Success Metrics

### User Value

**Efficiency Gains**:
- Time to create preset with defined segments: 2min → 30sec target
- Fewer manual LED range inputs per preset

**Consistency Improvements**:
- Naming consistency across presets: 0% → 100% via auto-labeling
- Names visible across all WLED interfaces (Pro + native)

### Technical Quality

**Code Quality**:
- [ ] Test coverage > 80% for new code
- [ ] No TypeScript errors or warnings
- [ ] No console errors in browser
- [ ] Passes ESLint with no violations

**Performance**:
- [ ] Lighthouse score remains > 90 (no regression)
- [ ] No layout shift from auto-labeling
- [ ] Auto-labeling < 10ms (benchmarked)

## Dependencies & Risks

### Dependencies

**Internal**:
- Existing segment utilities (`src/lib/segmentUtils.ts`) - reuse merging logic if applicable
- Current localStorage pattern (`src/lib/controllers.ts`) - follow subscription approach
- SegmentCard component - modify to show labels
- LightShowEditorScreen - integrate snap mode and name sync

**External**:
- No new external dependencies required
- Uses existing: React 19, TanStack Query, shadcn/ui, Tailwind v4

### Risks & Mitigation

**Risk 1: Auto-Labeling Performance**
- **Impact**: Medium - could slow preset loading
- **Likelihood**: Low (with memoization)
- **Mitigation**: Memoize sorted globals, benchmark with 50+ presets, add performance tests

**Risk 2: localStorage Quota Exceeded**
- **Impact**: Medium - feature unusable
- **Likelihood**: Low (typical < 10KB)
- **Mitigation**: Detect quota errors, show warning, suggest reducing groups

**Risk 3: WLED Name Sync Conflicts**
- **Impact**: Low - users could override names in native UI
- **Likelihood**: Medium
- **Mitigation**: WLED Pro is source of truth, can re-sync when opening preset editor

**Risk 4: Complexity Creep**
- **Impact**: High - delays delivery
- **Likelihood**: Low (streamlined plan)
- **Mitigation**: Simplified architecture, deferred V2 features, clear phase boundaries

## Future Considerations (V2+)

### Deferred Features

**Partial Match Labeling**:
- Segment 0-50 when global is 0-100 → "Lower roof (partial)"
- More complex algorithm, defer until user feedback

**Import/Export**:
- Export global segments as JSON
- Import to another controller
- Useful for multiple identical setups

**Auto-Detection Wizard**:
- Analyze existing presets for common split points
- Suggest creating global segments
- One-click migration

**Segment Color Coding**:
- Assign visual colors to segments (UI only)
- Show in visualizer and editor
- Helps distinguish zones visually

**Cross-Controller Copy**:
- Copy segment definitions between controllers
- Useful for identical LED strips

## References & Research

### Internal References

**Architecture & Patterns**:
- Controller storage: `/Users/alecf/wled-pro/src/lib/controllers.ts`
- React hook pattern: `/Users/alecf/wled-pro/src/hooks/useControllers.ts`
- Segment utilities: `/Users/alecf/wled-pro/src/lib/segmentUtils.ts`
- Light show editor: `/Users/alecf/wled-pro/src/components/shows/LightShowEditorScreen.tsx`
- Segment split screen: `/Users/alecf/wled-pro/src/components/shows/SegmentSplitScreen.tsx`

**Type Definitions**:
- WLED segment type: `/Users/alecf/wled-pro/src/types/wled.ts:34-57`
- Segment optional `n` property for name (WLED 0.13+)

**Testing Patterns**:
- Segment utilities tests: `/Users/alecf/wled-pro/src/lib/segmentUtils.test.ts`

### External References

**Framework Documentation**:
- [TanStack Query v5](https://tanstack.com/query/latest/docs/framework/react/overview)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

**Best Practices**:
- [Slider UX - Smashing Magazine](https://www.smashingmagazine.com/2017/07/designing-perfect-slider/)
- [localStorage Best Practices](https://www.robinwieruch.de/local-storage-react/)

**WLED API**:
- [WLED Segments](https://kno.wled.ge/features/segments/)
- [JSON API](https://kno.wled.ge/interfaces/json-api/)
- Project docs: `/Users/alecf/wled-pro/docs/wled-api/segments.md`

### Review Feedback Incorporated

**From Kieran (Critical Issues)**:
- ✅ Clarified WLED name syncing (sync to device `n` property)
- ✅ Fixed localStorage pattern (notifyListeners in hooks, not storage)
- ✅ Added explicit validation specification
- ✅ Fixed label return type (always SegmentLabel object)
- ✅ Optimized auto-labeling (memoize sorted globals)

**From DHH/Simplicity (Keep Groups)**:
- ✅ Removed color, order, version fields from MVP
- ✅ Simplified storage (single key)
- ✅ Inlined validation and snap logic
- ✅ Reduced component count
- ✅ Better snap mode naming and UI
- ✅ **Kept groups feature** (user requirement)

## Appendix: Critical Decisions

### 1. WLED Name Syncing

**Decision**: Sync global segment names to WLED's `n` property when saving presets

**Rationale**:
- Names visible in native WLED UI and mobile apps
- Consistent experience across interfaces
- Names persist on device (survive WLED Pro cache clear)

**Implementation**: Call `api.setState({ seg: [{ id, n: label }] })` when saving presets

### 2. Storage Architecture

**Decision**: Single localStorage key `wled-pro:segments` for all controllers

**Rationale**:
- Simpler than per-controller keys
- Easier to query/update
- Standard filtering in memory

**Implementation**: Filter by `controllerId` in getter functions

### 3. Label Return Type

**Decision**: Always return `SegmentLabel` object, never raw string

**Rationale**:
- Type safety (no string | object confusion)
- Consistent API
- Easier to extend (add fields without breaking)

**Implementation**: `{ display: string; tooltip?: string }`

### 4. Component Consolidation

**Decision**: Inline small utilities, merge related components

**Rationale**:
- Fewer files to navigate
- Clear context (logic near usage)
- ~200 LOC reduction

**Implementation**: Validation in segmentDefinitions.ts, snap logic in SplitScreen, unified ActionDialog

### 5. Groups in MVP

**Decision**: Keep groups feature in Phase 3 (not deferred)

**Rationale**:
- User explicitly requested
- Important for complex installations (20+ segments)
- UI-only feature, low risk

**Implementation**: Collapsible accordion sections with group assignment

---

**Plan Version**: 2.0 (Revised)
**Last Updated**: 2025-12-22
**Changes from v1**: Simplified data model, optimized performance, fixed type safety, clarified WLED sync, streamlined components
**Estimated Effort**: 3-4 days (reduced from 5-6 via simplifications)
