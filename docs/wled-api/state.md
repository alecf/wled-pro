# WLED State Object

The state object represents the current lighting configuration. Retrieved via `GET /json/state` or as part of `/json`. Updated via `POST /json/state`.

## Top-Level Properties

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `on` | boolean \| `"t"` | - | Power state. `"t"` toggles. |
| `bri` | integer | 0-255 | Master brightness. API never returns 0; device uses last non-zero value. |
| `transition` | integer | 0-65535 | Default crossfade duration in 100ms units (e.g., 7 = 700ms). |
| `tt` | integer | 0-65535 | Temporary transition for this request only. Not persisted. |
| `ps` | integer \| string | -1 to 250 | Load preset. -1 = none. Supports range syntax: `"1~17~"` cycles through presets 1-17. |
| `psave` | integer | 1-250 | Save current state to preset slot. Write-only. |
| `pss` | integer | bitmask | Preset cycle segments (bitfield for which segments to apply). |
| `pl` | integer | -1 to 250 | Currently active playlist ID. -1 = none. Read-only. |
| `mainseg` | integer | 0 to maxseg-1 | Main segment ID. This segment's color is reported to external APIs. |
| `seg` | array | - | Array of segment objects. See [segments.md](./segments.md). |

## Nightlight Properties (`nl`)

| Property | Type | Range | Description |
|----------|------|-------|-------------|
| `nl.on` | boolean | - | Nightlight active. |
| `nl.dur` | integer | 1-255 | Duration in minutes. |
| `nl.mode` | integer | 0-3 | Mode: 0=instant off, 1=fade to black, 2=fade to color, 3=sunrise. |
| `nl.tbri` | integer | 0-255 | Target brightness when nightlight completes. |
| `nl.rem` | integer | - | Remaining time in seconds. Read-only. |

## UDP Sync Properties (`udpn`)

| Property | Type | Description |
|----------|------|-------------|
| `udpn.send` | boolean | Send state changes via UDP broadcast. |
| `udpn.recv` | boolean | Receive and apply UDP broadcasts from other devices. |
| `udpn.sgrp` | integer | Sync group bitmask for sending (1-255). |
| `udpn.rgrp` | integer | Sync group bitmask for receiving (1-255). |

## Control Properties

| Property | Type | Description |
|----------|------|-------------|
| `v` | boolean | Request full state in response. Set to `true` when you need the response to include complete state. |
| `rb` | boolean | Reboot the device. Write-only. |
| `live` | boolean | Enter realtime/live mode. |
| `lor` | integer | Live override mode: 0=off, 1=override until data, 2=override until reboot. |
| `time` | integer | Unix timestamp. Set to sync device clock. |

## Preset/Playlist Syntax

The `ps` property supports special syntax for preset cycling:

```json
{"ps": "1~17~"}     // Cycle through presets 1-17
{"ps": "5~10~r"}    // Random preset from 5-10
{"ps": 5}           // Load preset 5 directly
```

## Example: Full State Update

```json
{
  "on": true,
  "bri": 128,
  "transition": 7,
  "seg": [{
    "id": 0,
    "fx": 42,
    "sx": 128,
    "ix": 200,
    "col": [[255, 0, 0], [0, 255, 0], [0, 0, 255]]
  }]
}
```

## Example: Minimal Updates

```json
{"on": "t"}                    // Toggle power
{"bri": "~25"}                 // Increase brightness by 25
{"ps": 3}                      // Load preset 3
{"nl": {"on": true, "dur": 30}} // Enable 30-minute nightlight
```
