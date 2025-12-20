# WLED Presets and Playlists

Presets save and restore complete lighting configurations. Playlists cycle through presets automatically.

## Constraints

- Maximum **250 presets** (IDs 1-250)
- Maximum **12 segments** on ESP8266, **16 segments** on ESP32
- Preset file stored at `/presets.json` on device filesystem
- Performance: ~50 single-segment or ~12 multi-segment presets recommended for responsiveness

## Retrieving Presets

```
GET /presets.json
```

Returns the full presets file with all saved presets.

## Loading Presets

### Via State API

```json
{"ps": 5}                    // Load preset 5
{"ps": "1~10~"}              // Cycle through presets 1-10 sequentially
{"ps": "1~10~r"}             // Random preset from range 1-10
```

### State Properties

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `ps` | integer \| string | -1 to 250 | Load preset. -1 = none. |
| `pss` | integer | bitmask | Segments to apply preset to (bitfield). |
| `pl` | integer | -1 to 250 | Currently active playlist. Read-only. |

## Saving Presets

### Via State API

```json
{"psave": 5}                 // Save current state to preset 5
{"psave": 5, "n": "My Preset"} // Save with name
```

### Preset Object Structure

When saving or retrieving, each preset contains:

| Property | Type | Description |
|----------|------|-------------|
| `n` | string | Preset name (supports emoji, max 6 consecutive spaces) |
| `ql` | string | Quick load label (max 2 chars or 1 emoji) |
| `on` | boolean | Power state |
| `bri` | integer | Brightness (0-255) |
| `transition` | integer | Transition time |
| `mainseg` | integer | Main segment ID |
| `seg` | array | Segment configurations |

### Save Options

When saving via the UI, additional options:

| Option | Description |
|--------|-------------|
| Include brightness | Save brightness value with preset |
| Save segment bounds | Required for boot presets to restore segments correctly |

## Playlists

Playlists automatically cycle through a sequence of presets.

### Playlist Object Structure

```json
{
  "playlist": {
    "ps": [1, 3, 5, 7],
    "dur": [50, 50, 50, 50],
    "transition": [7, 7, 7, 7],
    "repeat": 0,
    "end": 0
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `ps` | array | Preset IDs to cycle through |
| `dur` | array | Duration for each preset (×100ms, so 50 = 5 seconds) |
| `transition` | array | Transition time for each preset (×100ms) |
| `repeat` | integer | Number of times to repeat (0 = infinite) |
| `end` | integer | Preset ID to load when playlist ends (0 = stay on last) |

### Starting a Playlist

```json
{"playlist": {"ps": [1, 2, 3], "dur": [100, 100, 100]}}
```

### Stopping a Playlist

```json
{"pl": -1}
```

Or load any preset directly, which stops the playlist.

## Preset Cycling

The `ps` property supports special syntax for cycling:

| Syntax | Behavior |
|--------|----------|
| `"1~10~"` | Cycle forward through presets 1-10 |
| `"5~15~r"` | Random preset from range 5-15 |
| `"1~5~ 10~15~"` | Cycle through 1-5, then 10-15 (space separates ranges) |

## Quick Load Labels

Presets can have quick load labels (`ql`) that appear as buttons in the UI:

```json
{
  "1": {
    "n": "Morning Light",
    "ql": "AM",
    "on": true,
    "bri": 128
  }
}
```

- Maximum 2 characters or 1 emoji
- Appears as circle above preset list for rapid access

## Timed Presets

Presets can be applied on a schedule:

- 8 timer slots available in Time & Macros settings
- Uses 24-hour format
- Last 2 slots support sunrise/sunset triggers with ±59 minute offset
- Requires NTP sync and timezone configuration

## API Commands in Presets

Presets can contain HTTP or JSON API commands:

```json
{
  "5": {
    "n": "Toggle",
    "on": "t"
  }
}
```

```json
{
  "6": {
    "n": "Half Brightness",
    "bri": 128
  }
}
```

## Boot Preset

Configure in Settings → LED Preferences:

- Set default preset to load on power-on
- Must have "Save segment bounds" enabled to restore segments

## Backup and Restore

### Download

```
GET /presets.json
```

Save this file for backup.

### Upload

Upload via `/edit` page on the device web interface.

## Example: Complete Preset File

```json
{
  "1": {
    "n": "Warm Evening",
    "ql": "🌅",
    "on": true,
    "bri": 180,
    "transition": 20,
    "mainseg": 0,
    "seg": [{
      "id": 0,
      "start": 0,
      "stop": 150,
      "fx": 0,
      "col": [[255, 180, 100]]
    }]
  },
  "2": {
    "n": "Party Mode",
    "ql": "🎉",
    "on": true,
    "bri": 255,
    "seg": [{
      "id": 0,
      "fx": 9,
      "sx": 200,
      "pal": 6
    }]
  },
  "playlist": {
    "ps": [1, 2],
    "dur": [300, 300],
    "repeat": 0
  }
}
```
