# Light Shows (Presets)

Components for viewing and editing light show presets.

## Key Components

### PresetsScreen

Main screen listing all saved presets with quick actions.

Features:
- Grid view of preset cards
- Quick load buttons for presets with labels
- Create new preset button
- Edit current state option

### LightShowEditorScreen

Full-featured editor for current state or saved presets.

**Editor Modes:**
- **current**: Editing live device state (changes can apply immediately via live preview)
- **preset**: Editing a saved preset (must save to persist)

**Composed Hooks:**
- `useDeviceSync` - Manages local state, dirty tracking, and device sync
- `useSegmentOperations` - Segment CRUD operations

**Key Features:**
- Live preview toggle (sends changes to device immediately when enabled)
- Segment list with effect/color previews
- Add/merge/split/delete segments
- Apply global segments to create zones
- Save / Save As functionality
- Revert to discard changes

**State Flow:**
1. Load initial state (current device state or preset)
2. User makes edits via `useSegmentOperations`
3. Changes tracked locally via `useDeviceSync`
4. Live preview applies changes to device (optional)
5. Save persists to device (current) or preset file

### SegmentEditorScreen

Per-segment effect and color editing.

Features:
- Effect browser with search and filtering
- Palette browser for palette-based effects
- Color pickers for each color slot (shows only slots used by effect)
- Speed and intensity sliders
- Custom effect parameters (sliders, checkboxes)
- Brightness per-segment

### SegmentList

Displays segments with edit/delete actions.

```tsx
<SegmentList
  segments={segments}
  selectedSegments={selectedIds}
  onToggleSelect={handleToggle}
  onEditSegment={handleEdit}
  effects={effects}
  palettes={palettes}
/>
```

### PresetCard

Card displaying a preset with preview and quick actions.

```tsx
<PresetCard
  preset={preset}
  onLoad={handleLoad}
  onEdit={handleEdit}
/>
```

### GapCard

Displays gaps between segments where new segments could be added.

### MasterControls

Global brightness and power controls for the light show.

## Testing

Integration tests are in `LightShowEditorScreen.test.ts`:
- Mode-specific behavior (current vs preset)
- Live preview toggle handling
- Save/cancel operations
- Dirty state tracking

Run tests: `npm test`

## Import Pattern

```tsx
import { LightShowEditorScreen } from '@/components/shows/LightShowEditorScreen';
import { PresetsScreen } from '@/components/shows/PresetsScreen';
import { SegmentEditorScreen } from '@/components/shows/SegmentEditorScreen';
```
