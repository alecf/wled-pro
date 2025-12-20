# WLED Device Configuration

The configuration object contains persistent device settings. Retrieved via `GET /json/cfg`.

**Note:** Configuration changes typically require a device reboot to take effect.

## Retrieving Configuration

```
GET /json/cfg
```

## Configuration Structure

### Root Properties

| Property | Type | Description |
|----------|------|-------------|
| `rev` | [number, number] | Config revision [major, minor] |
| `vid` | integer | Version ID |
| `id` | object | Device identity settings |
| `nw` | object | Network configuration |
| `ap` | object | Access point settings |
| `hw` | object | Hardware configuration |
| `light` | object | Lighting behavior settings |
| `def` | object | Default/boot state |
| `if` | object | Interface settings |
| `remote` | object | Remote/button settings |
| `ol` | object | Overlay settings |
| `timers` | object | Timer/schedule settings |
| `ota` | object | OTA update settings |
| `um` | object | Usermod settings |

## Identity (`id`)

| Property | Type | Description |
|----------|------|-------------|
| `id.mdns` | string | mDNS hostname |
| `id.name` | string | Device friendly name |
| `id.inv` | string | Alexa invocation name |

## Network (`nw`)

| Property | Type | Description |
|----------|------|-------------|
| `nw.ins` | array | Network instances (WiFi connections) |

### Network Instance

| Property | Type | Description |
|----------|------|-------------|
| `ssid` | string | WiFi network name |
| `pskl` | integer | PSK (password) length (password not exposed) |
| `ip` | [n,n,n,n] | Static IP (0.0.0.0 for DHCP) |
| `gw` | [n,n,n,n] | Gateway address |
| `sn` | [n,n,n,n] | Subnet mask |

## Access Point (`ap`)

| Property | Type | Description |
|----------|------|-------------|
| `ap.ssid` | string | AP network name |
| `ap.pskl` | integer | AP password length |
| `ap.chan` | integer | WiFi channel |
| `ap.hide` | integer | Hidden SSID (0=visible, 1=hidden) |
| `ap.behav` | integer | AP behavior (0=always off, 1=on if no WiFi, 2=always on) |
| `ap.ip` | [n,n,n,n] | AP IP address |

## Hardware (`hw`)

### LED Configuration (`hw.led`)

| Property | Type | Description |
|----------|------|-------------|
| `total` | integer | Total LED count |
| `maxpwr` | integer | Max power budget (mA) |
| `ledma` | integer | mA per LED estimate |
| `cct` | boolean | CCT support enabled |
| `cr` | boolean | Color order correction |
| `cb` | integer | Color balance |
| `fps` | integer | Target FPS |
| `rgbwm` | integer | RGBW mode |
| `ld` | boolean | LED data disabled |
| `ins` | array | LED instances/strips |

### LED Instance

| Property | Type | Description |
|----------|------|-------------|
| `start` | integer | Starting LED index |
| `len` | integer | Number of LEDs |
| `pin` | array | GPIO pin(s) |
| `order` | integer | Color order (0=GRB, 1=RGB, 2=BRG, etc.) |
| `rev` | boolean | Reversed direction |
| `skip` | integer | Skip first N LEDs |
| `type` | integer | LED type ID |
| `ref` | boolean | Reflect/mirror |
| `rgbwm` | integer | RGBW mode override |
| `freq` | integer | Signal frequency (for PWM) |

### Button Configuration (`hw.btn`)

| Property | Type | Description |
|----------|------|-------------|
| `max` | integer | Max button count |
| `pull` | boolean | Enable internal pullup |
| `ins` | array | Button instances |
| `tt` | integer | Touch threshold |
| `mqtt` | boolean | Publish button to MQTT |

### Button Instance

| Property | Type | Description |
|----------|------|-------------|
| `type` | integer | Button type (0=disabled, 2=push, 3=pushx3, etc.) |
| `pin` | array | GPIO pin(s) |
| `macros` | [n,n,n] | Preset IDs for short/long/double press |

### IR Remote (`hw.ir`)

| Property | Type | Description |
|----------|------|-------------|
| `pin` | integer | IR receiver GPIO |
| `type` | integer | Remote type |
| `sel` | boolean | IR enabled |

### Relay (`hw.relay`)

| Property | Type | Description |
|----------|------|-------------|
| `pin` | integer | Relay GPIO |
| `rev` | boolean | Inverted logic |

## Lighting Behavior (`light`)

| Property | Type | Description |
|----------|------|-------------|
| `scale-bri` | integer | Brightness scaling factor |
| `pal-mode` | integer | Palette mode |
| `aseg` | boolean | Auto-segment mode |

### Gamma Correction (`light.gc`)

| Property | Type | Description |
|----------|------|-------------|
| `bri` | number | Brightness gamma |
| `col` | number | Color gamma |
| `val` | number | Value gamma |

### Transitions (`light.tr`)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | boolean | Transition mode enabled |
| `fx` | boolean | Transition on effect change |
| `dur` | integer | Default transition duration |
| `pal` | integer | Palette transition time |
| `rpc` | integer | Random palette change interval |

### Nightlight Defaults (`light.nl`)

| Property | Type | Description |
|----------|------|-------------|
| `mode` | integer | Default nightlight mode |
| `dur` | integer | Default duration (minutes) |
| `tbri` | integer | Default target brightness |
| `macro` | integer | Macro/preset to run on complete |

## Default State (`def`)

| Property | Type | Description |
|----------|------|-------------|
| `def.ps` | integer | Boot preset ID (0 = last state) |
| `def.on` | boolean | Default power state |
| `def.bri` | integer | Default brightness |

## Network Info Endpoint

```
GET /json/net
```

Returns available WiFi networks:

```json
{
  "networks": [
    {
      "ssid": "MyNetwork",
      "rssi": -45,
      "bssid": "AA:BB:CC:DD:EE:FF",
      "channel": 6,
      "enc": 4
    }
  ]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `ssid` | string | Network name |
| `rssi` | integer | Signal strength (dBm) |
| `bssid` | string | Access point MAC |
| `channel` | integer | WiFi channel |
| `enc` | integer | Encryption type |

## Example: Partial Config Response

```json
{
  "rev": [1, 0],
  "vid": 2307120,
  "id": {
    "mdns": "wled-living",
    "name": "Living Room",
    "inv": "living room lights"
  },
  "hw": {
    "led": {
      "total": 150,
      "maxpwr": 850,
      "fps": 42,
      "ins": [{
        "start": 0,
        "len": 150,
        "pin": [16],
        "order": 0,
        "type": 22
      }]
    }
  },
  "def": {
    "ps": 1,
    "on": true,
    "bri": 128
  }
}
```
