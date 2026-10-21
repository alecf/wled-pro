# Hooks Directory

Custom React hooks for WLED Pro.

## Organization

Hooks are organized by domain/feature rather than by query vs mutation type.

### WLED API Hooks

- **useQueryKeys.ts** - Centralized query key factory (import this first)
- **useWled.ts** - Queries and mutations: state/info, effects, palettes, `/json/cfg` sections,
  config mutations, reboot, playlists. Mutations go through the internal `useWledApiMutation`
  helper, which invalidates a key set (`stateKeys` = state + stateInfo, `configKeys` = config).
- **useWledWebSocket.ts** - The controller's live connection with debounced, optimistic updates.
  Only the `_controller` layout calls it; screens use `useControllerContext()`.
- **usePresets.ts** - Preset list (and the playlist preset), load, save, delete, reset

### State Management Hooks

- **useSegmentOperations.ts** - Local segment editing for the light show editor
- **useConfigEdits.ts** - Edit state for settings forms (`formData`, `setField`, `setNested`,
  `isDirty`, `reset`)

### Data Management Hooks

- **useControllers.ts** - Saved controllers and the selected controller (localStorage)
- **useSegmentDefinitions.ts** - Global segment management
- **useSegmentFileSync.ts** - Segment file storage on controller

### UI Hooks

- **useEffects.ts** - Effect metadata utilities
- **useApiActivity.ts** - Save-in-progress indicator (`useSaveOperation().wrapSave`)

Note: Safe area handling uses Tailwind utilities (`pt-safe`, `pb-safe`, etc.) defined in `src/index.css` rather than a hook.

## Query Key Conventions

All WLED query keys follow the pattern: `['wled', baseUrl, resource]`

Import from `useQueryKeys.ts`:
```tsx
import { getQueryKeys } from './useQueryKeys'

const keys = getQueryKeys(baseUrl)
// keys.state              - /json/state
// keys.info               - /json/info
// keys.stateInfo          - /json/si; also written by every WebSocket message
// keys.effects            - effect names
// keys.effectData         - effect metadata (/json/fxdata)
// keys.palettes           - palette names
// keys.palettesWithColors - palette names + colors
// keys.config             - /json/cfg (timers, NTP, LED hardware are selected from it)
// keys.networks           - WiFi scan results
// keys.presets            - /presets.json
```

## Key Hook APIs

### useSegmentOperations

```tsx
const {
  segments,
  updateSegment, // (id, updates) => void
  splitSegment, // (id, splitPoint) => void; no-op when all 10 ids are used
  mergeSegments, // (keepId, removeId) => void
  mergeGapUp, // (gapStart, gapStop) => void
  mergeGapDown, // (gapStart, gapStop) => void
  convertGapToSegment, // (gapStart, gapStop) => void
  setAllSegments, // (segments) => void
} = useSegmentOperations({
  initialSegments, // read on mount only; remount (key) to reset
  onSegmentsChange: (segments) => {
    /* called after every change, outside state updaters */
  },
})
```

### useWledWebSocket / useControllerContext

```tsx
const {
  state, // Device state merged with optimistic updates
  info, // Device info
  status, // 'connecting' | 'connected' | 'disconnected' | 'error'
  isConnected, // status === 'connected'
  isPolling, // HTTP polling because the WebSocket can't be used (HTTPS page)
  queueUpdate, // Send a state update (debounced, coalesced; HTTP if the socket is down)
  flushUpdates, // Send queued updates now
  toggle, // Toggle power
  setBrightness, // (bri) => void
  setOn, // (on) => void
} = useControllerContext() // plus controller and onOpenControllerPicker
```

## Import Pattern

Import hooks directly from their files (no barrel exports):

```tsx
import { useWledInfo, useSetSyncConfig } from '@/hooks/useWled'
import { useSegmentOperations } from '@/hooks/useSegmentOperations'
import { getQueryKeys } from '@/hooks/useQueryKeys'
```

## Testing

Test files are colocated with their hooks:
- `useQueryKeys.test.ts` - Query key pattern tests
- `useSegmentOperations.test.ts` - Segment operation tests (including stale closure tests)
- `useWled.test.tsx` - Config section hooks share one request

Run tests: `bun run test`
