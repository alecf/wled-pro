# WLED Node Discovery

WLED devices can discover other WLED instances on the local network.

## Retrieving Nodes

```
GET /json/nodes
```

## Response Structure

```json
{
  "nodes": [
    {
      "name": "Living Room",
      "ip": "192.168.1.100",
      "type": 32,
      "vid": 2307120
    },
    {
      "name": "Bedroom",
      "ip": "192.168.1.101",
      "type": 32,
      "vid": 2307120
    }
  ]
}
```

## Node Object Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Device friendly name |
| `ip` | string | IP address |
| `type` | integer | Node type identifier |
| `vid` | integer | WLED version ID (YYMMDDB format) |

## Node Types

| Value | Meaning |
|-------|---------|
| 0 | Unknown |
| 32 | WLED device |

## Discovery Mechanism

WLED uses UDP broadcast for node discovery:

1. Devices periodically broadcast their presence
2. Other WLED devices on the same network segment receive and cache these broadcasts
3. The `/json/nodes` endpoint returns all discovered nodes

## Usage Notes

- Discovery only works within the same network broadcast domain
- Nodes may take several seconds to appear after power-on
- Stale entries may persist briefly after a device goes offline
- The current device is typically included in the nodes list

## Example: Fetching All Nodes

```javascript
const response = await fetch('http://192.168.1.100/json/nodes');
const data = await response.json();

for (const node of data.nodes) {
  console.log(`${node.name}: ${node.ip}`);
}
```

## Integration with UDP Sync

Node discovery is separate from UDP sync (`udpn` in state). UDP sync allows devices to share state changes in real-time:

| Feature | Node Discovery | UDP Sync |
|---------|---------------|----------|
| Purpose | Find devices | Share state |
| Direction | Passive listening | Active send/receive |
| Configuration | Automatic | Manual enable |
| State Properties | None | `udpn.send`, `udpn.recv` |

See [state.md](./state.md) for UDP sync configuration.
