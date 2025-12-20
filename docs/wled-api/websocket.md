# WLED WebSocket API

Real-time bidirectional communication with WLED devices.

## Connection

**URL:** `ws://[device-ip]/ws`

**Protocol:** Standard WebSocket (RFC 6455)

**Availability:** Enabled by default since WLED 0.10.2

## Connection Limits

| Platform | Max Connections |
|----------|-----------------|
| ESP32 | 4 |
| ESP8266 | 2 (recommended) |

When limit is exceeded, the oldest connection is dropped to accommodate the new client.

## Message Types

### Client → Server

#### State Updates

Send JSON state objects to modify device state. Same format as HTTP `POST /json/state`.

```json
{"on": true, "bri": 128}
```

```json
{"seg": {"fx": 42, "sx": 200}}
```

All standard state properties are supported. See [state.md](./state.md) and [segments.md](./segments.md).

#### Request Full State

```json
{"v": true}
```

Server responds with complete state + info object.

#### Request Live LED Stream

```json
{"lv": true}
```

Server begins streaming current LED color values (equivalent to HTTP `/json/live`).

**Note:** Only one client can receive the live stream at a time. Requesting `{"lv": true}` from another client transfers the stream.

### Server → Client

#### State Updates (Automatic)

On any state change, server broadcasts to all connected clients:

```json
{
  "state": {
    "on": true,
    "bri": 128,
    "transition": 7,
    "ps": -1,
    "pl": -1,
    "nl": {"on": false, "dur": 60, "mode": 1, "tbri": 0},
    "udpn": {"send": false, "recv": true},
    "mainseg": 0,
    "seg": [/* segment objects */]
  },
  "info": {
    "ver": "0.14.0",
    "leds": {"count": 150, "fps": 42, "pwr": 450},
    /* ... other info properties */
  }
}
```

#### Initial State

New connections automatically receive state + info upon connect.

#### Live LED Data

When live stream is active, server sends LED color arrays matching `/json/live` format.

## Typical Usage Pattern

### 1. Connect and Receive Initial State

```javascript
const ws = new WebSocket('ws://192.168.1.100/ws');

ws.onopen = () => {
  console.log('Connected');
  // Initial state received automatically
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.state) {
    // Handle state update
    updateUI(data.state, data.info);
  }
};
```

### 2. Send Updates

```javascript
// Turn on with brightness
ws.send(JSON.stringify({on: true, bri: 200}));

// Change effect
ws.send(JSON.stringify({seg: {fx: 10}}));

// Request full state explicitly
ws.send(JSON.stringify({v: true}));
```

### 3. Handle Reconnection

```javascript
ws.onclose = () => {
  setTimeout(() => {
    // Reconnect logic
  }, 1000);
};
```

## Comparison with HTTP API

| Feature | WebSocket | HTTP |
|---------|-----------|------|
| Real-time updates | Yes (pushed) | No (polling required) |
| Connection overhead | Single connection | Per-request |
| State change notifications | Automatic | Must poll |
| Bidirectional | Yes | Request/response only |
| Max connections | 4 (ESP32) | Unlimited |
| Latency | Lower | Higher |

## Best Practices

1. **Limit connections:** Don't open multiple WebSocket connections to the same device. Use one connection per controller.

2. **Handle disconnects:** Implement automatic reconnection with backoff.

3. **Use for active views:** WebSocket is ideal when displaying live controller state. For background status checks, prefer HTTP polling.

4. **Parse carefully:** WebSocket messages are always JSON but may contain only state, only info, or both.

5. **Debounce outgoing:** When sending rapid updates (e.g., slider changes), debounce to avoid overwhelming the device.

## Error Handling

- Connection refused: Device may have max connections
- Connection dropped: Device rebooted or network issue
- Parse errors: Malformed JSON is silently ignored by device

WebSocket connections do not return error responses for invalid state values; the device simply ignores invalid properties.
