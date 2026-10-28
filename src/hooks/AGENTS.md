# Hooks Directory

Custom React hooks for WLED Pro.

## Organization

Hooks are organized by domain/feature rather than by query vs mutation type.

### WLED API Hooks

- **useQueryKeys.ts** - Centralized query key factory (import this first)
- **useWled.ts** - Queries and mutations: stateInfo (polling, used by the connection), effects,
  palettes, `/json/cfg` sections, `useSetConfig` (the one config write), reboot, firmware.
  State writes don't live here: they go through the connection (`queueUpdate` / `send`).
- **useWledApiMutation.ts** - The helper every HTTP mutation goes through: calls the API, then
  invalidates the keys it returns (without awaiting the refetch). Write new mutations with it.
- **useWledWebSocket.ts** - The controller's live connection with debounced, optimistic updates.
  Only the `_controller` layout calls it; screens use `useControllerContext()`.
- **usePresets.ts** - Preset list (and the playlist preset), save, delete, reset, and saving a
  playlist (`useSavePlaylist`). Load a preset (or start a playlist) with `send({ ps: id })` from
  the context

### State Management Hooks

- **useSegmentOperations.ts** - Local segment editing for the light show editor
- **useConfigEdits.ts** - Edit state for settings forms (`formData`, `setField`, `setNested`,
  `edits`, `isDirty`, `reset`; `reset(saved)` only drops the edits if they are still `saved`)
- **useSettingsForm.ts** - Saving for settings screens: sends every edited section in one
  `useSetConfig` POST (`toPatch` gets only the edited sections), toasts, refetches the config
  (joining the mutation's invalidation refetch, so one GET), then resets the saved edits. Edits
  made while the save was in flight are kept, and `isSaving` covers the POST and the refetch. A
  failed save keeps the edits. `save` throws (for RebootPrompt); `handleSave` toasts. `toPatch`
  should send only the fields the screen edits when a section holds fields it doesn't show:
  the cached config can be stale and would revert changes made elsewhere
- **useGoBack.ts** - Back for settings screens: history back, or `/shows` when opened directly
- **useLivePreview.ts** - The light show editor's live preview: `preview(segments)` (no-op while
  off), `setLivePreview(enabled, segments)`, `restore()` (back to what the device showed when the
  editor opened, if the editor changed it) and `toDeviceSegments` (the `seg` update, deleting
  removed segments)
- **useSleepTimer.ts** - `start(nl)` / `stop(nl)` the sleep timer over the connection, with toasts;
  `pending` (`'start'`, `'stop'` or null) is the action in flight, so controls can be disabled
  while one is

### Data Management Hooks

- **useControllers.ts** - Saved controllers and the selected controller (localStorage)
- **useSegmentDefinitions.ts** - Global segments: a query on `keys.segmentsFile` reads
  `/wled-pro-segments.json` (a 404 is an empty layout) and each edit updates the cache and writes
  the whole file through one mutation (`scope` keeps a controller's writes in order; a failed
  write toasts and refetches). Edits are ignored until the file has been read; check
  `isLoading` / `loadError` (retry with `reloadFromFile`) before treating an empty list as
  "no layout"

### UI Hooks

- **useEffects.ts** - Effect metadata utilities

Note: Safe area handling uses Tailwind utilities (`pt-safe`, `pb-safe`, etc.) defined in `src/index.css` rather than a hook.

## Query Key Conventions

All WLED query keys follow the pattern: `['wled', baseUrl, resource]`

Import from `useQueryKeys.ts`:
```tsx
import { getQueryKeys } from './useQueryKeys'

const keys = getQueryKeys(baseUrl)
// keys.stateInfo          - /json/si; also written by every WebSocket message
// keys.effects            - effect names
// keys.effectData         - effect metadata (/json/fxdata)
// keys.palettes           - palette names
// keys.palettesWithColors - palette names + colors
// keys.config             - /json/cfg (timers, NTP, LED hardware are selected from it)
// keys.networks           - WiFi scan results
// keys.presets            - /presets.json
// keys.segmentsFile       - /wled-pro-segments.json (global segments)
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
  initialSegments, // read on mount only; remount (key) to reset. Ids are renumbered to
  // 0..n-1 (normalizeSegmentIds) on mount and after every operation, so removing a segment
  // shifts the ids after it
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
  send, // (update) => Promise: send now, with anything queued, on the same channel; rejects
  // if an HTTP send fails. Use for actions with a success/failure toast
  flushUpdates, // Send queued updates now; returns a promise that never rejects (await it
  // before an HTTP write that must land after them)
  refresh, // Re-read state + info over HTTP (WebSocket info only changes with state); the
  // result is dropped if a WebSocket message arrived meanwhile
  isRefreshing,
  toggle, // Toggle power
  setBrightness, // (bri) => void
  setOn, // (on) => void
} = useControllerContext() // plus controller and onOpenControllerPicker
```

Queued updates and the optimistic overlay belong to one controller: when `baseUrl` changes (or
the hook unmounts) pending updates are flushed to the old controller and the overlay is cleared.

## Import Pattern

Import hooks directly from their files (no barrel exports):

```tsx
import { useSetConfig, useWledFullConfig } from '@/hooks/useWled'
import { useSegmentOperations } from '@/hooks/useSegmentOperations'
import { getQueryKeys } from '@/hooks/useQueryKeys'
```

## Testing

Test files are colocated with their hooks:
- `useQueryKeys.test.ts` - Query key pattern tests
- `useSegmentOperations.test.ts` - Segment operation tests (including stale closure tests)
- `useWled.test.tsx` - Config section hooks share one request

Run tests: `bun run test`
