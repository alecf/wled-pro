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
segments. Segments removed in the editor are deleted on the device (`stop: 0`).

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
