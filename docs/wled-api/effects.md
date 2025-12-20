# WLED Effects

Effects control the animation pattern displayed on LEDs. WLED includes 187 built-in effects (IDs 0-186).

## Retrieving Effects

- `GET /json/eff` - Array of effect names (index = effect ID)
- `GET /json/fxdata` - Array of effect metadata strings

## Setting Effects

```json
{"seg": {"fx": 42}}         // Set effect by ID
{"seg": {"fx": "~"}}        // Next effect
{"seg": {"fx": "~-"}}       // Previous effect
{"seg": {"fx": "r"}}        // Random effect
```

## Effect Parameters

Each effect uses a subset of these parameters:

| Property | Range | Description |
|----------|-------|-------------|
| `sx` | 0-255 | Speed (animation rate) |
| `ix` | 0-255 | Intensity (density, brightness, or other effect-specific) |
| `c1` | 0-255 | Custom parameter 1 |
| `c2` | 0-255 | Custom parameter 2 |
| `c3` | 0-31 | Custom parameter 3 |
| `o1` | boolean | Custom option 1 |
| `o2` | boolean | Custom option 2 |
| `o3` | boolean | Custom option 3 |

## Effect Metadata Format

The `/json/fxdata` endpoint returns metadata strings describing each effect's parameters:

```
<params>;<colors>;<palette>;<flags>;<defaults>
```

### Parameter Tokens

| Token | Meaning |
|-------|---------|
| `!` | Uses speed slider |
| `!` (2nd position) | Uses intensity slider |
| `Sliders:` prefix | Custom slider labels |
| `Checkboxes:` prefix | Custom checkbox labels |

### Color Tokens

| Token | Meaning |
|-------|---------|
| `!` | Uses palette colors |
| `1` | Uses 1 color slot |
| `2` | Uses 2 color slots |
| `3` | Uses 3 color slots |

### Flag Values

| Flag | Meaning |
|------|---------|
| `0` | Default (no special behavior) |
| `1` | Effect is an overlay |
| `2` | 2D effect (for LED matrices) |
| `128` | Audio-reactive (volume) |
| `192` | Audio-reactive (FFT/frequency) |

### Example Metadata

```
"!,!;;!;1;sx=24,ix=128"
```
- Uses speed slider
- Uses intensity slider
- Uses palette
- Is an overlay effect
- Defaults: speed=24, intensity=128

## Effect Categories

### Basic (0-20)

| ID | Name | Description |
|----|------|-------------|
| 0 | Solid | Static color |
| 1 | Blink | On/off flashing |
| 2 | Breathe | Fade in and out |
| 3 | Wipe | Color wipe across strip |
| 4 | Wipe Random | Random color wipe |
| 5 | Random Colors | Random color per LED |
| 6 | Sweep | Bi-directional wipe |
| 7 | Dynamic | Random brightness flicker |
| 8 | Colorloop | Hue rotation |
| 9 | Rainbow | Moving rainbow |
| 10 | Scan | Single pixel scanner |
| 11 | Scan Dual | Two-direction scanner |
| 12 | Fade | Color fading |
| 13 | Theater | Theater chase pattern |
| 14 | Theater Rainbow | Theater chase with rainbow |
| 15 | Running | Moving colored pixels |
| 16 | Saw | Sawtooth wave |
| 17 | Twinkle | Random twinkle |
| 18 | Dissolve | Random pixel dissolve |
| 19 | Dissolve Rnd | Dissolve with random colors |
| 20 | Sparkle | Single random sparkle |

### Effect Type Indicators

Effects are marked with symbols indicating their type:

| Symbol | Meaning |
|--------|---------|
| ⋮ | 1D linear effect |
| ▦ | 2D matrix effect |
| ♪ | Volume-reactive (uses sound amplitude) |
| ♫ | Frequency-reactive (uses FFT audio analysis) |

### Audio-Reactive Effects

Require audio input or simulate with `si` segment property:

- Freqmap (ID 155)
- GEQ (ID 139)
- Gravimeter (ID 132)
- Waterfall (ID 140)
- Waverly (ID 165)
- DJ Light (ID 141)
- Pixels (ID 133)

### Overlay Effects

Can layer on top of other effects (flag value 1):

- Bouncing Balls (ID 91)
- Drip (ID 96)
- Fireworks (ID 89)
- Popcorn (ID 95)
- Rain (ID 43)

### 2D Matrix Effects (WLED 0.14+)

For LED matrices, not strips:

- Matrix (ID 153)
- Game of Life (ID 172)
- Julia (ID 168)
- Akemi (ID 186)
- Colored Bursts (ID 167)

## Version Requirements

| Effect ID Range | Minimum Version |
|-----------------|-----------------|
| 0-117 | WLED 0.13 |
| 118-186 | WLED 0.14+ |

## Example: Set Effect with Parameters

```json
{
  "seg": {
    "id": 0,
    "fx": 9,
    "sx": 128,
    "ix": 200,
    "pal": 6
  }
}
```

This sets segment 0 to Rainbow effect (ID 9) with speed 128, intensity 200, and Party palette.
