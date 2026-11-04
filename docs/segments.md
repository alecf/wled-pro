# Segments in the code

The app has two segment models. The root `AGENTS.md` explains what each one is for; this page
is about how the code keeps them apart and where they meet.

|                | WLED segment (`Segment`, `src/types/wled.ts`)               | Global segment (`GlobalSegment`, `src/types/segments.ts`) |
| -------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| ID             | `number`, a slot index 0-9 (kept contiguous)                | `string` (UUID), stable                                   |
| Name           | `n`, optional; WLED drops it unless sent with each update   | `name`, required                                          |
| Range          | `start` inclusive, `stop` exclusive                         | the same                                                  |
| Coverage       | may leave gaps; gaps are shown and can be filled            | edited only by split and merge, so no gaps between them  |
| Other fields   | effect, colors, palette, speed, …                           | `groupId`                                                 |
| Lives in       | device state, or a preset in `/presets.json`                | `/wled-pro-segments.json` on the controller               |
| Edited by      | `useSegmentOperations` (local) over `src/lib/segmentUtils.ts` | `useSegmentDefinitions` over `src/lib/segmentDefinitions.ts` |

Keep the two sets of helpers separate: `segmentUtils.ts` functions take `Segment[]` and handle
gaps and slot ids, `segmentDefinitions.ts` functions take `GlobalSegment[]` and keep the strip
free of gaps. Don't make one accept the other.

## Where they meet

- **Labels**: `getSegmentLabel` (`src/lib/segmentLabeling.ts`) names a WLED segment by its `n`,
  else by a global segment with exactly the same range, else "Segment N".
- **Applying a layout**: `globalSegmentsToWledSegments` (`src/lib/lightshow.ts`) turns the global
  segments into WLED segments, copying the effect and colors from a template segment.
- **Splitting**: `SplitSegmentDialog` splits either kind. It takes the global segments as a prop
  (their boundaries are its snap points); it doesn't load them itself.
- **Rows**: `SegmentRow` renders either kind from `{ id, start, stop, name }` plus optional effect
  info, which only light show screens pass.
