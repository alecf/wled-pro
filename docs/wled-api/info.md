# WLED Info Object

The info object contains read-only device information. Retrieved via `GET /json/info` or as part of `/json`.

## Top-Level Properties

| Property | Type | Description |
|----------|------|-------------|
| `ver` | string | WLED version name (e.g., "0.14.0") |
| `vid` | integer | Build ID in YYMMDDB format (e.g., 2307120 = 2023-07-12, build 0) |
| `cn` | string | Release channel name |
| `name` | string | User-defined device name |
| `udpport` | integer | UDP port for realtime data (default: 21324) |
| `live` | boolean | Currently receiving realtime data |
| `liveseg` | integer | Segment receiving live data (-1 if none) |
| `lm` | string | Live mode description when active |
| `lip` | string | IP address of realtime data source |
| `fxcount` | integer | Number of available effects |
| `palcount` | integer | Number of available palettes |
| `cpalcount` | integer | Number of custom palettes |
| `maps` | array | Available LED layout maps |

## LED Properties (`leds`)

| Property | Type | Description |
|----------|------|-------------|
| `leds.count` | integer | Total LED count |
| `leds.pwr` | integer | Current power draw estimate (mA) |
| `leds.fps` | integer | Current refresh rate (frames per second) |
| `leds.maxpwr` | integer | Maximum power budget in mA (0 = unlimited) |
| `leds.maxseg` | integer | Maximum number of segments supported |
| `leds.seglc` | array | Per-segment light capabilities (see below) |
| `leds.lc` | integer | Logical AND of all segment capabilities |
| `leds.rgbw` | boolean | **Deprecated.** RGBW support. Use `lc` bitmask instead. |
| `leds.wv` | integer | White channel value version |
| `leds.cct` | integer | CCT (color temperature) support level |

## Light Capabilities Bitmask (`lc` / `seglc`)

| Bit | Value | Meaning |
|-----|-------|---------|
| 0 | 1 | Segment supports RGB |
| 1 | 2 | Segment has white channel |
| 2 | 4 | Segment supports CCT (color temperature) |

Examples:
- `lc: 1` = RGB only
- `lc: 3` = RGB + White (RGBW)
- `lc: 7` = RGB + White + CCT

## WiFi Properties (`wifi`)

| Property | Type | Description |
|----------|------|-------------|
| `wifi.bssid` | string | Connected access point BSSID |
| `wifi.rssi` | integer | Raw signal strength (dBm, negative) |
| `wifi.signal` | integer | Signal quality (0-100%) |
| `wifi.channel` | integer | WiFi channel |

## Filesystem Properties (`fs`)

| Property | Type | Description |
|----------|------|-------------|
| `fs.u` | integer | Used filesystem space (KB) |
| `fs.t` | integer | Total filesystem space (KB) |
| `fs.pmt` | integer | Preset modification time (Unix timestamp) |

## Hardware Properties

| Property | Type | Description |
|----------|------|-------------|
| `arch` | string | Platform architecture (e.g., "esp32", "esp8266") |
| `core` | string | Arduino core version |
| `lwip` | integer | LwIP version |
| `freeheap` | integer | Free heap memory (bytes) |
| `uptime` | integer | Seconds since boot |
| `time` | string | Current time (if NTP configured) |
| `opt` | integer | Compile-time options bitmask |
| `brand` | string | Device brand (if custom build) |
| `product` | string | Product name (if custom build) |
| `mac` | string | Hardware MAC address (hex, no separators) |
| `ip` | string | Device IP address |

## Example Response

```json
{
  "ver": "0.14.0",
  "vid": 2307120,
  "name": "WLED Living Room",
  "udpport": 21324,
  "live": false,
  "liveseg": -1,
  "fxcount": 187,
  "palcount": 71,
  "leds": {
    "count": 150,
    "pwr": 450,
    "fps": 42,
    "maxpwr": 850,
    "maxseg": 10,
    "seglc": [3, 3],
    "lc": 3,
    "rgbw": true
  },
  "wifi": {
    "bssid": "AA:BB:CC:DD:EE:FF",
    "rssi": -65,
    "signal": 70,
    "channel": 6
  },
  "fs": {
    "u": 24,
    "t": 512,
    "pmt": 1689178200
  },
  "arch": "esp32",
  "core": "v4.4.4",
  "freeheap": 125432,
  "uptime": 86400,
  "mac": "AABBCCDDEEFF",
  "ip": "192.168.1.100"
}
```

## Usage Notes

- All info properties are read-only
- The `leds.fps` value reflects actual rendering performance
- Power estimates (`leds.pwr`) are approximations based on color values
- WiFi signal quality is derived from RSSI using a quality curve
- MAC address is useful for identifying devices on the network
