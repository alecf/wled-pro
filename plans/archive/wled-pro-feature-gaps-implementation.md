# WLED Pro Feature Gaps Implementation Plan

**Created**: 2025-12-26
**Category**: enhancement
**Priority**: HIGH
**Status**: Planning

---

## Overview

WLED Pro is a modern replacement UI for WLED LED controllers. After comprehensive analysis comparing the current implementation against the official WLED UI and documentation at [kno.wled.ge](https://kno.wled.ge/), this plan identifies and prioritizes the remaining features needed for feature parity.

### Current Implementation Summary

**Fully Implemented:**
- Light Shows (Presets): Create, edit, delete, load presets
- Segment Editor: Effects, colors, palettes, brightness, speed, intensity
- Effects Browser: Search, filter, metadata display
- Palettes: Visual preview of all palettes
- Global Segments: App-specific feature for reusable layouts
- Device Info: LEDs, WiFi, uptime, storage, performance
- Sleep Timer: Nightlight with fade modes
- Schedules: 10 timer slots with weekday selection
- Time & Location: NTP, timezone, geolocation
- LED Hardware: Basic LED count and power settings
- Master Controls: Power toggle, global brightness

**Not Implemented (22 features identified):**
- Configuration screens (WiFi, 2D, Sync, Security, Usermods)
- Playlists
- Live Preview (Peek)
- Segment advanced features
- And more detailed below

---

## Problem Statement / Motivation

Users migrating from the official WLED UI expect feature parity. Without configuration screens, users must fall back to the original UI for essential operations like:
- Changing WiFi networks (critical when moving devices)
- Setting up multi-device sync
- Configuring 2D matrices
- Enabling security features
- Updating firmware

This creates a fragmented user experience and limits WLED Pro's usefulness as a complete replacement.

---

## Feature Gap Analysis

### HIGH PRIORITY - Core WLED Features

#### 1. WiFi Setup
**Route**: `/settings/wifi`
**Config Endpoint**: `POST /json/cfg` with `nw` (network) section

**Features needed:**
- Primary WiFi network (SSID, password)
- Static IP configuration (IP, gateway, subnet, DNS)
- mDNS hostname (e.g., `wled-living.local`)
- Access Point configuration:
  - AP SSID and password
  - Hidden network option
  - AP behavior (always off, fallback only, always on)
  - AP IP address and channel
- WiFi network scanning (`GET /json/net`)
- WiFi sleep mode toggle

**Files to create:**
- `src/routes/_controller.settings.wifi.tsx`
- `src/components/wifi/WifiSetupScreen.tsx`
- `src/components/wifi/NetworkScanner.tsx`
- `src/components/wifi/StaticIpForm.tsx`
- `src/components/wifi/AccessPointForm.tsx`

**Critical edge cases:**
- Connection loss recovery when wrong credentials entered
- Device unreachable after bad config (needs physical reset)
- Password handling (API only returns length, not actual password)
- Reboot required after changes

---

#### 2. 2D Configuration
**Route**: `/settings/2d-matrix`
**Config Endpoint**: `POST /json/cfg` with `hw.led` matrix section

**Features needed:**
- Enable/disable 2D mode
- Matrix dimensions (width × height)
- Panel arrangement for multi-panel setups
- Serpentine wiring pattern toggle
- Start corner selection (top-left, top-right, bottom-left, bottom-right)
- LED mapping preview
- Custom LED map file upload (`ledmap.json`)

**Files to create:**
- `src/routes/_controller.settings.2d-matrix.tsx`
- `src/components/matrix/MatrixConfigScreen.tsx`
- `src/components/matrix/PanelArrangementEditor.tsx`
- `src/components/matrix/MatrixPreview.tsx`

**Critical edge cases:**
- Width × Height must equal total LED count
- Panel arrangement validation
- Effect compatibility (some effects are 1D-only or 2D-only)
- Reboot required after changes

---

#### 3. Sync Settings
**Route**: `/settings/sync`
**Config Endpoint**: `POST /json/cfg` with `if` (interface) section

**Features needed:**
- **UDP Sync**:
  - Send/receive toggles
  - Sync groups (bitmask 1-255)
  - Port configuration
  - Broadcast address
- **E1.31 (sACN)**:
  - Enable multicast
  - Starting universe
  - DMX mode (11 modes)
  - Skip out-of-sequence packets
- **Art-Net**:
  - Enable/disable
  - Universe settings
- **DDP**:
  - Enable/disable
  - Port configuration
- **MQTT**:
  - Broker address and port
  - Username/password
  - Client ID
  - Device and group topics
  - TLS toggle
- **Philips Hue**:
  - Bridge IP
  - Light ID to sync with
  - Poll interval
- **Alexa**:
  - Enable emulation
  - Invocation name
- **Realtime/Adalight**:
  - Baud rate for serial
  - Timeout after no data

**Files to create:**
- `src/routes/_controller.settings.sync.tsx`
- `src/components/sync/SyncSettingsScreen.tsx`
- `src/components/sync/UdpSyncSection.tsx`
- `src/components/sync/E131Section.tsx`
- `src/components/sync/MqttSection.tsx`
- `src/components/sync/AlexaSection.tsx`

**Critical edge cases:**
- Conflict when multiple sync protocols active
- Port conflicts with other services
- MQTT security (credentials stored on device)
- Reboot may be required for some changes

---

#### 4. Security & Updates
**Route**: `/settings/security`
**Config Endpoint**: `POST /json/cfg` with `ota` section

**Features needed:**
- **OTA Lock**:
  - Enable/disable
  - Password setting (default: "wledota")
  - Password change
- **Settings PIN**:
  - 4-digit PIN to protect settings
- **Recovery AP**:
  - Disable recovery AP option
- **Factory Reset**:
  - Full device reset with confirmation
- **Firmware Update**:
  - Current version display
  - File upload for .bin firmware
  - Progress indicator
  - Auto-reboot after update
- **ArduinoOTA**:
  - Enable/disable

**Files to create:**
- `src/routes/_controller.settings.security.tsx`
- `src/components/security/SecuritySettingsScreen.tsx`
- `src/components/security/OtaLockSection.tsx`
- `src/components/security/FirmwareUpdateSection.tsx`
- `src/components/security/FactoryResetSection.tsx`

**Critical edge cases:**
- OTA password forgotten (requires physical reset)
- Firmware upload failure (device may become unresponsive)
- Power loss during update (may brick device)
- Authentication headers for API when OTA locked

---

#### 5. Usermods
**Route**: `/settings/usermods`
**Config Endpoint**: `POST /json/cfg` with `um` section

**Features needed:**
- List installed usermods
- Generic configuration UI based on usermod schema
- Link to custom usermod pages at `/u/{modname}.htm`
- Common usermods with dedicated UI:
  - Temperature sensors (BME280, AHT10)
  - PIR motion detection
  - Rotary encoder + display
  - Four-line display
  - Battery monitoring
  - PWM fan control

**Files to create:**
- `src/routes/_controller.settings.usermods.tsx`
- `src/components/usermods/UsermodsScreen.tsx`
- `src/components/usermods/UsermodCard.tsx`
- `src/components/usermods/GenericUsermodConfig.tsx`

**Edge cases:**
- Usermod API not standardized
- May need to iframe custom pages
- Settings vary per usermod
- Some usermods require reboot

---

#### 6. Playlists
**Route**: `/shows/playlists` or integrated into presets screen
**State Endpoint**: `POST /json/state` with `pl` property

**Features needed:**
- Create playlist from presets
- Set duration per preset (in seconds, converts to ×100ms)
- Set transition time between presets
- Shuffle toggle
- Repeat count (0 = infinite)
- End preset (what to load when done)
- Play/stop playlist controls
- Current position indicator

**Files to create:**
- `src/routes/_controller.shows.playlist.tsx`
- `src/components/shows/PlaylistEditorScreen.tsx`
- `src/components/shows/PlaylistPresetRow.tsx`
- `src/hooks/usePlaylists.ts`

**Edge cases:**
- WLED only supports ONE global playlist
- Preset deleted while in playlist
- Progress tracking (client-side timing only)
- Duration unit conversion (user sees seconds, API uses ×100ms)

---

#### 7. Live Preview (Peek)
**Location**: Inline on current state/preset views, or modal
**Data Source**: Client-side computation or `/json/live` (if available)

**Features needed:**
- Real-time LED color visualization
- 1D strip view (horizontal bars)
- 2D matrix view (requires 2D config)
- Segment boundary indicators
- Zoom/pan for large installations
- Optional: Effect animation preview

**Files to create:**
- `src/components/preview/LivePreview.tsx`
- `src/components/preview/StripPreview.tsx`
- `src/components/preview/MatrixPreview.tsx`
- `src/lib/ledColorComputation.ts`

**Edge cases:**
- No API for individual LED states (must compute from segments)
- Dynamic effects impossible to perfectly replicate
- Performance with 1000+ LEDs
- Color accuracy (screen vs. physical LEDs)

---

#### 8. Segment Advanced Features
**Location**: Segment editor screen (expand existing)
**State Endpoint**: `POST /json/state` with segment properties

**Features needed:**
- **Grouping (`grp`)**: Treat N LEDs as one pixel (1-255)
- **Spacing (`spc`)**: Skip LEDs between groups (0-255)
- **Offset (`of`)**: Shift effect start position (0-255)
- **Freeze (`frz`)**: Pause segment animation (boolean)
- **Reverse (`rev`)**: Flip segment direction (boolean)
- **Mirror (`mi`)**: Reflect second half (boolean)

**Files to modify:**
- `src/components/shows/SegmentEditorScreen.tsx` (add Advanced section)

**Files to create:**
- `src/components/segments/AdvancedSegmentOptions.tsx`

**Edge cases:**
- Feature interaction order: grouping → spacing → offset → reverse → mirror
- Visual preview of transformations
- Effect compatibility with grouping/spacing

---

### MEDIUM PRIORITY - Settings & Configuration

#### 9. Device Name/Identity Settings
**Route**: `/settings/identity` (or combine with UI settings)
**Config Endpoint**: `POST /json/cfg` with `id` section

**Features needed:**
- Server description/device name
- mDNS hostname
- Alexa invocation name

**Files to create:**
- `src/routes/_controller.settings.identity.tsx`
- `src/components/identity/IdentitySettingsScreen.tsx`

---

#### 10. UI Preferences
**Route**: `/settings/ui` (or combine with identity)
**Config Endpoint**: `POST /json/cfg` with `ui` section

**Features needed:**
- Sync button behavior
- Default interface appearance preferences

---

#### 11. Boot/Default State Configuration
**Route**: `/settings/defaults`
**Config Endpoint**: `POST /json/cfg` with `def` section

**Features needed:**
- Boot preset selection
- Default on/off state
- Default brightness
- Apply preset on boot toggle
- Transition defaults (duration, palette blending)
- Nightlight defaults

**Files to create:**
- `src/routes/_controller.settings.defaults.tsx`
- `src/components/defaults/DefaultsSettingsScreen.tsx`

---

#### 12. Transitions
**Location**: Add to defaults settings or master controls
**State Endpoint**: `POST /json/state` with `transition` property

**Features needed:**
- Default transition duration (0-255, ×100ms)
- Per-change transition duration (`tt` property)
- Palette transition speed

---

#### 13. Button/IR Configuration
**Route**: `/settings/buttons` (or combine with sync)
**Config Endpoint**: `POST /json/cfg` with `hw.btn` section

**Features needed:**
- Physical button enable (GPIO)
- Button type (push, switch, touch)
- Macros: short press, long press, double press
- Infrared receiver type and GPIO

**Files to create:**
- `src/routes/_controller.settings.buttons.tsx`
- `src/components/buttons/ButtonConfigScreen.tsx`

---

#### 14. Relay Configuration
**Route**: `/settings/relay` (or combine with buttons)
**Config Endpoint**: `POST /json/cfg` with `hw.relay` section

**Features needed:**
- Relay GPIO pin
- Inverted logic toggle
- Multi-relay support

---

#### 15. Quick Load Labels
**Location**: Preset editor screen
**Preset Endpoint**: Presets already support `ql` property

**Features needed:**
- 1-2 character or emoji shortcut
- Display on preset cards
- Quick load button bar

**Files to modify:**
- `src/components/shows/PresetCard.tsx`
- `src/components/shows/LightShowEditorScreen.tsx`

---

#### 16. Node Discovery
**Route**: `/settings/nodes` or home screen addition
**Endpoint**: `GET /json/nodes`

**Features needed:**
- Discover other WLED devices on network
- Display device list with name, IP, status
- Add discovered device to controllers list
- Refresh scan

**Files to create:**
- `src/components/nodes/NodeDiscoveryScreen.tsx`
- `src/hooks/useWledNodes.ts` (already exists, add UI)

---

### LOWER PRIORITY - Niche Features

#### 17. Custom Palette Editor
**Route**: `/palettes/editor`
**Mechanism**: Upload `palette0.json` - `palette9.json` files

**Features needed:**
- Visual gradient editor
- Color stop placement
- Preview with test effect
- Export/import JSON

---

#### 18. Pixel Art Converter
**Route**: `/tools/pixart`
**Mechanism**: Client-side image processing

**Features needed:**
- Image upload
- Resize to LED dimensions
- Color quantization
- Export as preset

---

#### 19. File Manager
**Route**: `/settings/files`
**Endpoint**: `/edit` filesystem access

**Features needed:**
- List files on device
- Upload/download files
- Delete files
- Edit JSON files
- Backup/restore presets.json

---

#### 20. CCT (Color Temperature)
**Location**: Segment color editor
**State Endpoint**: Segment `cct` property

**Features needed:**
- Color temperature slider (warm to cool)
- White balance per segment
- Only show for RGBW/CCT strips

**Files to modify:**
- `src/components/shows/ColorPicker.tsx`

---

#### 21. Power Monitoring
**Location**: Device info screen
**Source**: Computed from LED count × mA setting

**Features needed:**
- Current draw estimate (mA)
- Comparison to power limit
- Warning when near limit

**Files to modify:**
- `src/components/info/InfoScreen.tsx`

---

#### 22. Individual LED Control
**Location**: Segment editor (advanced)
**State Endpoint**: Segment `i` property

**Features needed:**
- Set specific LED colors within segment
- LED picker grid
- Range selection

---

## Technical Considerations

### Architecture Patterns

**Config Settings Screens Pattern:**
```tsx
// Follow existing pattern from time-location settings
const { data: config } = useWledConfig(baseUrl);
const { mutate: setConfig } = useSetConfig(baseUrl);

// Form state
const [formData, setFormData] = useState(config?.nw || {});

// Save handler
const handleSave = () => {
  setConfig({ nw: formData });
  // Some changes require reboot
  if (requiresReboot) {
    rebootDevice();
  }
};
```

**New Hooks Needed:**
```typescript
// src/hooks/useWledConfig.ts
export function useWledConfig(baseUrl: string) // GET /json/cfg
export function useSetWifiConfig(baseUrl: string)
export function useSetSyncConfig(baseUrl: string)
export function useSet2dConfig(baseUrl: string)
export function useSetSecurityConfig(baseUrl: string)
export function useRebootDevice(baseUrl: string)
export function useFirmwareUpdate(baseUrl: string)
```

### Error Handling

**Network Configuration Safety:**
1. Validate credentials before saving (ping test if possible)
2. Show prominent warning about device becoming unreachable
3. Provide recovery instructions in UI
4. Implement connection retry with exponential backoff

**Reboot Flow:**
1. Send config update
2. Show "Rebooting..." with spinner
3. Poll `/json/info` every 2 seconds
4. Timeout after 30 seconds with error
5. Auto-reconnect when device responds

### Security Implications

- OTA password stored on device (possibly plaintext)
- WiFi passwords only returned as length, not actual value
- Settings PIN protects web UI but API may bypass
- MQTT credentials stored on device

---

## Acceptance Criteria

### Functional Requirements

#### WiFi Setup
- [ ] User can scan for and select WiFi networks
- [ ] User can configure static IP settings
- [ ] User can set mDNS hostname
- [ ] User can configure Access Point settings
- [ ] App handles reboot and reconnects automatically
- [ ] Error shown if connection fails

#### 2D Configuration
- [ ] User can enable/disable 2D mode
- [ ] User can set matrix dimensions
- [ ] User can configure serpentine pattern
- [ ] User can arrange multiple panels
- [ ] Validation prevents invalid configurations
- [ ] Preview shows LED numbering

#### Sync Settings
- [ ] User can enable/disable UDP sync send/receive
- [ ] User can configure E1.31 universe settings
- [ ] User can configure MQTT broker and topics
- [ ] User can enable Alexa integration

#### Security & Updates
- [ ] User can set OTA lock password
- [ ] User can upload firmware updates
- [ ] User can factory reset device
- [ ] Progress shown during firmware upload

#### Usermods
- [ ] User can see list of installed usermods
- [ ] User can configure usermod settings
- [ ] User can access custom usermod pages

#### Playlists
- [ ] User can create playlist from presets
- [ ] User can set duration and transition per preset
- [ ] User can play/stop playlist
- [ ] Playlist state shown in UI

#### Live Preview
- [ ] LED colors visualized in real-time
- [ ] Works for 1D strips
- [ ] Works for 2D matrices (if configured)
- [ ] Segment boundaries visible

#### Segment Advanced
- [ ] User can set grouping, spacing, offset
- [ ] User can toggle freeze, reverse, mirror
- [ ] Changes preview immediately

### Non-Functional Requirements

- [ ] Settings screens load within 2 seconds
- [ ] Reboot detection within 30 seconds
- [ ] Works on mobile and desktop
- [ ] All forms validate input before saving

---

## Success Metrics

- Feature parity with official WLED UI for common operations
- Users can complete full device setup without original UI
- Zero reports of device bricking due to bad config handling
- Settings changes persist correctly after reboot

---

## Dependencies & Prerequisites

1. **Config API Documentation**: Need to verify exact JSON structure for each config section
2. **Test Device**: ESP32 with LED strip for testing all features
3. **Type Definitions**: Add TypeScript types for config sections in `src/types/wled.ts`

---

## Risk Analysis & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| User enters bad WiFi config, device unreachable | HIGH | MEDIUM | Clear warnings, recovery instructions, validate before save |
| Firmware update corrupts device | HIGH | LOW | Version verification, checksum validation, progress tracking |
| Config API differs from documentation | MEDIUM | MEDIUM | Test on real device, add extensive error handling |
| Usermod API not standardized | MEDIUM | HIGH | Use iframe for custom pages, hardcode popular usermods |
| Live preview inaccurate for dynamic effects | LOW | HIGH | Show disclaimer, use static preview for complex effects |

---

## Implementation Phases

### Phase 1: Foundation (1-2 weeks)
1. Add config hooks to `src/hooks/useWled.ts`
2. Add TypeScript types for all config sections
3. Create reusable components: `ConfigSection`, `RebootPrompt`, `ConfigForm`
4. Implement Security Settings (lowest risk, establishes patterns)

### Phase 2: Critical Settings (2-3 weeks)
1. WiFi Setup with error recovery
2. Sync Settings
3. 2D Configuration

### Phase 3: Core Features (2 weeks)
1. Playlists
2. Segment Advanced Features
3. Live Preview (basic 1D)

### Phase 4: Remaining Settings (1-2 weeks)
1. Usermods
2. Device Identity
3. Boot/Default State
4. Button/IR Configuration

### Phase 5: Polish (1-2 weeks)
1. Quick Load Labels
2. Node Discovery
3. Power Monitoring
4. Remaining edge cases and testing

### Phase 6: Nice-to-Have (Optional)
1. Custom Palette Editor
2. File Manager
3. Pixel Art Converter
4. CCT Support
5. Individual LED Control

---

## References

### Internal References
- Current settings pattern: `src/routes/_controller.settings.time-location.tsx`
- API client: `src/api/wled.ts`
- React Query hooks: `src/hooks/useWled.ts`
- Type definitions: `src/types/wled.ts`
- WLED API docs: `docs/wled-api/`

### External References
- [WLED Knowledge Base](https://kno.wled.ge/)
- [WLED Settings Documentation](https://kno.wled.ge/features/settings/)
- [WLED JSON API](https://kno.wled.ge/interfaces/json-api/)
- [WLED Config Documentation](https://kno.wled.ge/interfaces/json-api/#configuration)
- [WLED Segments](https://kno.wled.ge/features/segments/)
- [WLED Presets & Playlists](https://kno.wled.ge/features/presets/)
- [WLED 2D Matrix](https://kno.wled.ge/features/2d/)
- [WLED LED Mapping](https://kno.wled.ge/advanced/mapping/)
- [WLED E1.31/DMX](https://kno.wled.ge/interfaces/e1.31-dmx/)
- [WLED MQTT](https://kno.wled.ge/interfaces/mqtt/)
- [WLED Security](https://kno.wled.ge/advanced/security/)
- [WLED Web GUI Subpages](https://kno.wled.ge/features/subpages/)

---

## MVP

The minimum viable implementation should include:

1. **Security Settings** - OTA lock, factory reset
2. **WiFi Setup** - Basic network configuration with recovery flow
3. **Sync Settings** - UDP sync and Alexa
4. **Playlists** - Create and play preset sequences
5. **Segment Advanced** - Grouping, spacing, freeze, reverse, mirror

This covers the most commonly requested features while establishing patterns for the remaining screens.
