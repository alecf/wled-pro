# WLED JSON API Overview

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/json` | GET | Full response: state + info + effects + palettes |
| `/json/state` | GET | Current state only |
| `/json/info` | GET | Device info (read-only) |
| `/json/si` | GET | State + info combined |
| `/json/eff` | GET | Effects list (array of names) |
| `/json/pal` | GET | Palettes list (array of names) |
| `/json/fxdata` | GET | Effect metadata strings |
| `/json/palx` | GET | Extended palette info |
| `/json/cfg` | GET | Device configuration |
| `/json/net` | GET | Network information |
| `/json/nodes` | GET | Discovered WLED nodes |
| `/json/live` | GET | Live LED color values |

## Request/Response

- **GET requests** retrieve current values
- **POST requests** to `/json` or `/json/state` update values
- Response includes updated state when `{"v": true}` is sent

## Partial Updates

POST requests accept incomplete state objects. Only specified fields are updated; unspecified fields retain their current values.

```json
// Only updates brightness, leaves everything else unchanged
{"bri": 128}
```

## Request Size Limits

| Platform | Maximum Request Size |
|----------|---------------------|
| ESP8266 | 10 KB |
| ESP32 | 24 KB |

## Value Modifiers

Several properties support special string values for relative changes:

| Modifier | Meaning | Example |
|----------|---------|---------|
| `"t"` | Toggle (booleans only) | `{"on": "t"}` |
| `"~"` | Increment by 1 | `{"seg": {"fx": "~"}}` |
| `"~-"` | Decrement by 1 | `{"seg": {"fx": "~-"}}` |
| `"~10"` | Increment by 10 | `{"seg": {"sx": "~10"}}` |
| `"~-10"` | Decrement by 10 | `{"seg": {"sx": "~-10"}}` |
| `"r"` | Random value | `{"seg": {"fx": "r"}}` |

These modifiers work on: `fx`, `sx`, `ix`, `pal`, `c1`, `c2`, `c3`

## Color Formats

Colors can be specified as:

1. **RGB/RGBW arrays**: `[255, 170, 0]` or `[255, 170, 0, 128]`
2. **Hex strings**: `"FFAA00"` or `"FFAA0080"`
3. **Nested in segment**: `{"seg": {"col": [[255,170,0], [0,0,0], [64,64,64]]}}`

Each segment supports up to 3 color slots:
- Slot 0: Primary/Foreground color
- Slot 1: Secondary/Background color
- Slot 2: Tertiary/Accent color

## Response Structure

A full `/json` response contains:

```json
{
  "state": { /* current state - see state.md */ },
  "info": { /* device info - see info.md */ },
  "effects": ["Solid", "Blink", ...],
  "palettes": ["Default", "Random Cycle", ...]
}
```

## Error Handling

The API returns HTTP 200 for successful requests. Malformed JSON or invalid values are silently ignored rather than returning errors.
