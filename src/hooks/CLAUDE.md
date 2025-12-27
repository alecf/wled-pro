# Hooks Directory

Custom React hooks for WLED Pro.

## Organization

Hooks are organized by domain/feature rather than by query vs mutation type.

### WLED API Hooks

- **useQueryKeys.ts** - Centralized query key factory (import this first)
- **useWled.ts** - Core state queries and mutations (power, brightness, segments, effects, palettes, config)
- **useWledWebSocket.ts** - WebSocket connection with auto-reconnect and optimistic updates
- **usePresets.ts** - Preset CRUD operations

### State Management Hooks

- **useDeviceSync.ts** - Local state editing with live preview support
- **useSegmentOperations.ts** - Segment manipulation (update, merge, split, delete)

### Data Management Hooks

- **useControllers.ts** - Controller localStorage management
- **useSegmentDefinitions.ts** - Global segment management
- **useSegmentFileSync.ts** - Segment file storage on controller

### UI Hooks

- **useEffects.ts** - Effect metadata utilities

Note: Safe area handling uses Tailwind utilities (`pt-safe`, `pb-safe`, etc.) defined in `src/index.css` rather than a hook.

## Query Key Conventions

All WLED query keys follow the pattern: `['wled', baseUrl, resource]`

Import from `useQueryKeys.ts`:
```tsx
import { getQueryKeys } from './useQueryKeys';

const keys = getQueryKeys(baseUrl);
// keys.fullState - Complete WLED state (state + info + effects + palettes)
// keys.state - Just the state object
// keys.info - Device info
// keys.effects - Available effects list
// keys.palettes - Available palettes list
// keys.presets - Saved presets
// keys.config - Device configuration
// keys.timers - Timer schedules
// keys.nodes - Discovered nodes
```

## Key Hook APIs

### useDeviceSync

Manages local state editing with optional live preview:

```tsx
const {
  localState,      // Current local state
  isDirty,         // Has unsaved changes
  isConnected,     // WebSocket connection status
  applyToDevice,   // Send current state to device
  revertToInitial, // Discard changes, restore initial state
  updateLocalState,// Update local state (auto-applies in live preview)
  updateSegment,   // Update a specific segment
} = useDeviceSync({
  baseUrl,
  initialState,
  livePreviewEnabled: true,
});
```

### useSegmentOperations

Segment manipulation with stale-closure-safe callbacks:

```tsx
const {
  segments,
  updateSegment,   // (id, updates) => void
  mergeSegments,   // (ids[]) => void
  splitSegment,    // (id, splitPoint) => void
  deleteSegment,   // (id) => void
  addSegment,      // (segment) => void
  resetSegments,   // (segments) => void
} = useSegmentOperations({
  initialSegments,
  ledCount,
  onSegmentsChange: (segments) => { /* callback */ },
});
```

### useWledWebSocket

WebSocket connection with debounced updates:

```tsx
const {
  state,           // Current device state (merged with optimistic updates)
  info,            // Device info
  status,          // 'connecting' | 'connected' | 'disconnected' | 'error'
  isConnected,     // Boolean shorthand
  queueUpdate,     // Send update (debounced, coalesced)
  toggle,          // Toggle WebSocket enabled/disabled
} = useWledWebSocket(baseUrl, {
  enabled: true,
  debounceMs: 50,
});
```

## Import Pattern

Import hooks directly from their files (no barrel exports):

```tsx
import { useWledState, useSetBrightness } from '@/hooks/useWled';
import { useDeviceSync } from '@/hooks/useDeviceSync';
import { useSegmentOperations } from '@/hooks/useSegmentOperations';
import { getQueryKeys } from '@/hooks/useQueryKeys';
```

## Testing

Test files are colocated with their hooks:

- `useQueryKeys.test.ts` - Query key pattern tests
- `useSegmentOperations.test.ts` - Segment operation tests (including stale closure tests)
- `useDeviceSync.test.ts` - Device sync tests (including WebSocket integration)

Run tests: `npm test`
