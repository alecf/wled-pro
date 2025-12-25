# WLED Timers (Scheduled Presets)

WLED supports 10 timer slots that can trigger presets at specific times. Timers 0-7 are standard time-based triggers with optional date ranges. Timers 8-9 are special sunrise/sunset triggers.

## Timer Structure

Timers are configured via the `/json/cfg` endpoint under the `timers` object.

### Configuration Endpoint

```
GET /json/cfg
POST /json (with config object)
```

**Important:** Configuration changes require a device reboot to take effect.

## Timer Configuration

```json
{
  "timers": {
    "ins": [
      {
        "en": 1,        // Enabled (0 = disabled, 1 = enabled)
        "hour": 7,      // Hour (0-23, 24 = every hour, 255 = sunrise/sunset)
        "min": 30,      // Minute (0-59, or offset -59 to +59 for sunrise/sunset)
        "macro": 1,     // Preset ID to trigger (1-250)
        "dow": 127,     // Days of week bitmask (see below)
        "start": {      // Optional: only for timers 0-7
          "mon": 1,     // Start month (1-12)
          "day": 1      // Start day (1-31)
        },
        "end": {        // Optional: only for timers 0-7
          "mon": 12,    // End month (1-12)
          "day": 31     // End day (1-31)
        }
      }
      // ... up to 10 timer objects
    ]
  }
}
```

## Timer Slots

| Slot | Type | Description |
|------|------|-------------|
| 0-7  | Standard | Time-based triggers with optional date ranges |
| 8    | Sunrise | Triggers at sunrise + offset (minutes) |
| 9    | Sunset | Triggers at sunset + offset (minutes) |

## Timer Properties

### `en` - Enabled
- `0` = Disabled
- `1` = Enabled

### `hour` - Hour
- **Standard timers (0-7):**
  - `0-23` = Specific hour (24-hour format)
  - `24` = Trigger every hour
- **Sunrise/Sunset timers (8-9):**
  - `255` = Use sunrise/sunset calculation
  - Other values are ignored

### `min` - Minute
- **Standard timers (0-7):**
  - `0-59` = Specific minute
- **Sunrise/Sunset timers (8-9):**
  - `-59` to `+59` = Offset in minutes from sunrise/sunset
  - Negative = before sunrise/sunset
  - Positive = after sunrise/sunset

### `macro` - Preset ID
- `1-250` = Preset ID to trigger
- `0` = No action

### `dow` - Days of Week Bitmask

The `dow` field is a bitmask representing which days of the week the timer should trigger.

**Bit mapping:**
- Bit 0 (value 1): Monday
- Bit 1 (value 2): Tuesday
- Bit 2 (value 4): Wednesday
- Bit 3 (value 8): Thursday
- Bit 4 (value 16): Friday
- Bit 5 (value 32): Saturday
- Bit 6 (value 64): Sunday

**Common values:**
- `127` (0b1111111) = Every day
- `31` (0b0011111) = Weekdays (Mon-Fri)
- `96` (0b1100000) = Weekends (Sat-Sun)
- `1` (0b0000001) = Monday only
- `64` (0b1000000) = Sunday only

### `start` / `end` - Date Range (Timers 0-7 only)

Timers 0-7 can optionally specify a date range when they're active.

- `start.mon` / `end.mon` = Month (1-12)
- `start.day` / `end.day` = Day (1-31)
- Default range: Jan 1 - Dec 31 (always active)

## Examples

### Standard Timer: Weekday Morning Alarm

```json
{
  "timers": {
    "ins": [
      {
        "en": 1,
        "hour": 7,
        "min": 0,
        "macro": 5,
        "dow": 31
      }
    ]
  }
}
```

Triggers preset 5 at 7:00 AM Monday-Friday.

### Sunset Timer with Offset

```json
{
  "timers": {
    "ins": [
      null, null, null, null, null, null, null, null,
      null,
      {
        "en": 1,
        "hour": 255,
        "min": -30,
        "macro": 10,
        "dow": 127
      }
    ]
  }
}
```

Triggers preset 10 30 minutes before sunset, every day. (Timer slot 9)

### Seasonal Timer

```json
{
  "timers": {
    "ins": [
      {
        "en": 1,
        "hour": 18,
        "min": 0,
        "macro": 3,
        "dow": 127,
        "start": {
          "mon": 11,
          "day": 1
        },
        "end": {
          "mon": 12,
          "day": 31
        }
      }
    ]
  }
}
```

Triggers preset 3 at 6:00 PM every day, but only from November 1 - December 31.

### Every Hour Timer

```json
{
  "timers": {
    "ins": [
      {
        "en": 1,
        "hour": 24,
        "min": 0,
        "macro": 8,
        "dow": 127
      }
    ]
  }
}
```

Triggers preset 8 at the top of every hour, every day.

## Updating Timers

To update timers, POST a configuration object to `/json`:

```javascript
const config = {
  timers: {
    ins: [
      {
        en: 1,
        hour: 8,
        min: 30,
        macro: 1,
        dow: 127
      }
    ]
  }
};

await fetch('http://wled-device/json', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(config)
});

// Reboot device for changes to take effect
await fetch('http://wled-device/reset', { method: 'POST' });
```

## Requirements

- **NTP Sync:** Device must have accurate time via NTP
- **Timezone:** Timezone must be configured for local time calculation
- **Sunrise/Sunset:** Requires latitude/longitude for timers 8-9

## Implementation Details

From the WLED source code (wled00/ntp.cpp):
- Timers are checked every minute
- All conditions must be met for a timer to trigger:
  - Timer is enabled
  - Current hour and minute match (or hour = 24 for every hour)
  - Current day of week bit is set in `dow`
  - Current date is within `start` and `end` range (if specified)
- Once triggered, the specified preset/macro is applied immediately
