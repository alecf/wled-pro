# WLED Palettes

Palettes define color gradients used by effects. WLED includes 71 built-in palettes (IDs 0-70) plus support for custom palettes.

## Retrieving Palettes

- `GET /json/pal` - Array of palette names (index = palette ID)
- `GET /json/palx` - Extended palette information

## Setting Palettes

```json
{"seg": {"pal": 6}}         // Set palette by ID
{"seg": {"pal": "~"}}       // Next palette
{"seg": {"pal": "~-"}}      // Previous palette
{"seg": {"pal": "r"}}       // Random palette
```

## Built-in Palettes

### Special Palettes (0-5)

| ID | Name | Description |
|----|------|-------------|
| 0 | Default | Automatically selected based on effect |
| 1 | Random Cycle | Changes randomly every few seconds |
| 2 | Color 1 | Uses segment's primary color only |
| 3 | Colors 1&2 | Gradient between primary and secondary |
| 4 | Color Gradient | Gradient mixing all three segment colors |
| 5 | Colors Only | Uses all three segment colors discretely |

### Rainbow/Color Palettes (6-13)

| ID | Name | Description |
|----|------|-------------|
| 6 | Party | Rainbow without green hues |
| 7 | Cloud | Gray-blue atmospheric |
| 8 | Lava | Red-orange-yellow fire |
| 9 | Ocean | Blue-green water |
| 10 | Forest | Green nature tones |
| 11 | Rainbow | Full spectrum |
| 12 | Rainbow Bands | Striped rainbow |
| 13 | Sunset | Orange-red gradient |

### Temperature/Fire Palettes (14-20)

| ID | Name | Description |
|----|------|-------------|
| 14 | Rivendell | Cool forest green-blue |
| 15 | Breeze | Light blue-green |
| 16 | Red & Blue | Alternating warm/cool |
| 17 | Yellowout | Yellow fading to black |
| 18 | Analogous | Adjacent color wheel |
| 19 | Splash | Bold color splashes |
| 20 | Pastel | Soft muted colors |

### Nature/Seasonal (21-40)

| ID | Name |
|----|------|
| 21 | Sunset 2 |
| 22 | Beach |
| 23 | Vintage |
| 24 | Departure |
| 25 | Landscape |
| 26 | Beech |
| 27 | Sherbet |
| 28 | Hult |
| 29 | Hult 64 |
| 30 | Drywet |
| 31 | Jul |
| 32 | Grintage |
| 33 | Rewhi |
| 34 | Tertiary |
| 35 | Fire |
| 36 | Icefire |
| 37 | Cyane |
| 38 | Light Pink |
| 39 | Autumn |
| 40 | Magenta |

### Specialty Palettes (41-55)

| ID | Name |
|----|------|
| 41 | Magred |
| 42 | Yelmag |
| 43 | Yelblu |
| 44 | Orange & Teal |
| 45 | Tiamat |
| 46 | April Night |
| 47 | Orangery |
| 48 | C9 |
| 49 | Sakura |
| 50 | Aurora |
| 51 | Atlantica |
| 52 | C9 2 |
| 53 | C9 New |
| 54 | Temperature |
| 55 | Aurora 2 |

### Additional Palettes (56-70)

| ID | Name |
|----|------|
| 56 | Retro Clown |
| 57 | Candy |
| 58 | Toxy Reaf |
| 59 | Fairy Reaf |
| 60 | Semi Blue |
| 61 | Pink Candy |
| 62 | Red Reaf |
| 63 | Aqua Flash |
| 64 | Yelblu Hot |
| 65 | Lite Light |
| 66 | Red Flash |
| 67 | Blink Red |
| 68 | Red Shift |
| 69 | Red Tide |
| 70 | Candy2 |

## Custom Palettes (WLED 0.14+)

### Overview

- Up to 10 custom palettes (IDs 0-9 in custom namespace)
- Stored as JSON files on device filesystem
- Named `palette0.json` through `palette9.json`
- Displayed as "~ Custom 0 ~" through "~ Custom 9 ~" in UI

### File Format

```json
{
  "palette": [
    0, 255, 0, 0,
    85, 0, 255, 0,
    170, 0, 0, 255,
    255, 255, 255, 255
  ]
}
```

Format: `[position, R, G, B, position, R, G, B, ...]`

- Position: 0-255 (gradient position)
- R, G, B: 0-255 (color values)

### Uploading Custom Palettes

1. Create JSON file with palette data
2. Upload via `/edit` page on WLED device
3. Reboot controller for palette to appear

## Palette + Effect Interaction

- Palette ID 0 (Default) lets the effect choose its optimal palette
- Palette ID 1 (Random Cycle) changes palette automatically
- Effects may use palette colors differently (gradient, discrete, etc.)
- Some effects ignore palette and only use segment colors

## Example

```json
{
  "seg": {
    "id": 0,
    "fx": 9,
    "pal": 6,
    "col": [[255, 0, 0], [0, 255, 0], [0, 0, 255]]
  }
}
```

Sets Rainbow effect with Party palette. The segment colors (col) are used when palette is set to Color 1, Colors 1&2, Color Gradient, or Colors Only.
