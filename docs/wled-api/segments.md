# WLED Segments

Segments divide an LED strip into independent zones, each with its own effect, colors, and settings.

## Constraints

- Maximum **10 segments** per device (IDs 0-9)
- Segment 0 is the **main segment** by default
- The main segment's color is reported to HTTP and MQTT APIs
- `stop` LED is exclusive (not included in segment)

## Segment Object Properties

### Identification

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `id` | integer | 0-9 | Segment identifier. Required when updating specific segment. |
| `n` | string | - | Segment name (optional). |

### LED Range

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `start` | integer | 0 to count-1 | First LED index (inclusive). |
| `stop` | integer | 0 to count | Last LED index (exclusive). LED at `stop` is NOT included. |
| `len` | integer | 0 to count | Segment length. Alternative to `stop`: `stop = start + len`. |

### Colors

| Property | Type | Description |
|----------|------|-------------|
| `col` | array | Up to 3 color slots: `[[R,G,B], [R,G,B], [R,G,B]]` or `[[R,G,B,W], ...]` for RGBW. |

Color slots:
- Slot 0: Primary/Foreground (Fx)
- Slot 1: Secondary/Background (Bg)
- Slot 2: Tertiary/Accent (Cs)

Color formats accepted:
- RGB array: `[255, 170, 0]`
- RGBW array: `[255, 170, 0, 128]`
- Hex string: `"FFAA00"` or `"FFAA0080"`

### Effect Settings

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `fx` | integer \| string | 0 to fxcount-1 | Effect ID. Supports `"~"`, `"~-"`, `"r"`. |
| `sx` | integer \| string | 0-255 | Effect speed. Supports `"~"`, `"~-"`, `"~10"`. |
| `ix` | integer \| string | 0-255 | Effect intensity. Supports `"~"`, `"~-"`, `"~10"`. |
| `pal` | integer \| string | 0 to palcount-1 | Palette ID. Supports `"~"`, `"~-"`, `"r"`. |

### Custom Effect Parameters

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `c1` | integer | 0-255 | Custom slider 1 (effect-specific). |
| `c2` | integer | 0-255 | Custom slider 2 (effect-specific). |
| `c3` | integer | 0-31 | Custom slider 3 (effect-specific, narrower range). |
| `o1` | boolean | - | Custom option/checkbox 1. |
| `o2` | boolean | - | Custom option/checkbox 2. |
| `o3` | boolean | - | Custom option/checkbox 3. |

### Display Modifiers

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `grp` | integer | 1-255 | Grouping: treat N physical LEDs as one virtual LED. |
| `spc` | integer | 0-255 | Spacing: gap between lit LED groups. |
| `of` | integer | -len to len | Offset: shift effect starting position. Negative counts from end. |
| `rev` | boolean | - | Reverse effect direction. |
| `mi` | boolean | - | Mirror: reflect effect from center. |
| `rpt` | boolean | - | Repeat settings across remaining LEDs after this segment. |

### Segment State

| Property | Type | Description |
|----------|------|-------------|
| `on` | boolean | Segment power state. |
| `bri` | integer (0-255) | Segment brightness (multiplied with master brightness). |
| `sel` | boolean | Selected: segment receives updates from API calls without explicit ID. |
| `frz` | boolean | Freeze: pause effect animation. |

### Color Temperature

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `cct` | integer | 0-255 or 1900-10091 | Color temperature. 0-255 is relative (cold to warm). 1900-10091 is Kelvin. |

### 2D/Matrix Settings

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `m12` | integer | 0-4 | 1D-to-2D expansion mode for 1D effects on 2D matrix. |
| `si` | integer | 0-3 | Sound simulation type (for audio-reactive effects without audio input). |

## Individual LED Control

Set specific LED colors within a segment using the `i` property:

```json
{"seg": {"i": [0, "FF0000", 5, "00FF00", 10, "0000FF"]}}
```

Format: `[index, color, index, color, ...]`

Range format:
```json
{"seg": {"i": [0, 10, "FF0000"]}}  // LEDs 0-9 set to red
```

Format: `[start, stop, color]`

## Examples

### Create/Update Segment

```json
{
  "seg": [{
    "id": 0,
    "start": 0,
    "stop": 50,
    "fx": 42,
    "sx": 128,
    "ix": 200,
    "pal": 6,
    "col": [[255, 0, 0], [0, 0, 0], [0, 0, 0]]
  }]
}
```

### Add Second Segment

```json
{
  "seg": [{
    "id": 1,
    "start": 50,
    "stop": 100,
    "fx": 0,
    "col": [[0, 255, 0]]
  }]
}
```

### Delete Segment

Set `stop` equal to or less than `start`:

```json
{"seg": [{"id": 1, "stop": 0}]}
```

### Update Selected Segments Only

Without `id`, updates apply to all segments where `sel: true`:

```json
{"seg": {"fx": 10, "sx": 200}}
```

### Cycle Through Effects

```json
{"seg": {"id": 0, "fx": "~"}}   // Next effect
{"seg": {"id": 0, "fx": "~-"}}  // Previous effect
{"seg": {"id": 0, "fx": "r"}}   // Random effect
```
