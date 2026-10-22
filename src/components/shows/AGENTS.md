# Light Shows (Presets)

Components for viewing and editing light show presets.

## Key Components

### PresetsScreen

Main screen: master power/brightness controls, the current state, the list of saved light shows
(playlist presets are left out; they live on the playlist screen), and "Create New Light Show"
(replaces all segments with one default segment, then opens the current-state editor).

### LightShowEditorScreen

Editor for the current state or a saved preset.

**Structure:** the exported `LightShowEditorScreen` waits for device state (and presets, in
preset mode), works out the starting segments and name, then mounts the inner editor with a
`key`, so the editor never initializes from data that hasn't loaded.

**Modes:**
- **current**: starts from the device's segments; changes apply live. Back keeps them, Cancel
  restores the device as it was when the editor opened.
- **preset**: starts from the preset's stored segments (fields it didn't store come from the
  device's segment with the same id). Live preview is off by default; turning it on shows the
  edits on the device, turning it off (or Cancel/Back) restores the device.

**Saving:** Save / Save As repair the segments (`repairSegments`) and send them together with
`psave`, `ib` and `sb` in one `/json/state` request, so the preset captures exactly the edited
segments. Segment ids are kept contiguous (`0..n-1`, in ascending order) so they match WLED's
slot indices; `segmentsToDeviceUpdate` renumbers to match and deletes device ids `>= n`.
Segments removed in the editor are deleted on the device (`stop: 0`), including ones
the editor created that the device hasn't reported back yet. The editor remembers every segment
id it has sent and never forgets one (the WebSocket `state` can lag behind, and a request that
deleted a segment may have failed), so every update re-sends those deletes. That's harmless: WLED
ignores a `stop: 0` for a slot that doesn't exist, and one for an already-inactive slot only
counts towards a purge (see [segments.md](../../../docs/wled-api/segments.md#segment-ids-are-slot-indices)),
which removes inactive slots only, so it can't renumber the kept ids `0..n-1`.
`psave` with `ib` stores the device's _current_ `on`/`bri`, so re-saving a preset also sends the
preset's own `on`/`bri` (and its `ql` when overwriting). Any segment field the editor can change
must be listed in `DEVICE_SEGMENT_KEYS` (`src/lib/wled-state.ts`) or it is silently not sent.

**Composed hooks:** `useControllerContext` (state + `queueUpdate`), `useSegmentOperations`.

### SegmentEditorScreen

Per-segment effect and color editing: effect picker, effect parameters (sliders and `o1`-`o3`
checkboxes), colors (only the slots the effect uses), palette, brightness, LED range. The UI
shows the last LED as `stop - 1` (WLED's `stop` is exclusive).

### SegmentList

Segments and gaps of the strip, with split/merge actions and gap actions (extend the segment
above/below, or create a segment in the gap).

### PresetCard

A saved light show: color swatches, segment count (ignoring WLED's `{stop: 0}` deleted-segment
entries), play and delete buttons; tapping it opens the editor.

### GapCard

Displays gaps between segments where new segments could be added.

### MasterControls

Global brightness and power controls.

## Testing

`LightShowEditorScreen.test.tsx` renders the editor with a fake `ControllerContext` and checks
preset seeding and what Save / Save As send.

Run tests: `bun run test`

## Import Pattern

```tsx
import { LightShowEditorScreen } from '@/components/shows/LightShowEditorScreen'
import { PresetsScreen } from '@/components/shows/PresetsScreen'
```
