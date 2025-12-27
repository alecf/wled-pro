# WLED Pro

A modern UI for WLED LED controllers built with React, TypeScript, and Vite.

## Commands

```bash
npm run dev             # Start dev server
npm run build           # Build for production
npm run lint            # Run ESLint
npm test                # Run tests (watch mode)
npm run test:coverage   # Run tests with coverage
npm run generate-icons  # Regenerate PWA icons from icon.svg
```

## Architecture

### Tech Stack
- React 19 + TypeScript
- Vite (build tool)
- TanStack React Query (server state management)
- Tailwind CSS v4 + shadcn/ui (styling)
- Vitest + Testing Library (testing)
- PWA with vite-plugin-pwa (offline support & installability)

### Project Structure
```
src/
├── api/              # WLED API client
├── components/       # React components
│   ├── common/       # Shared UI components (PageHeader, LoadingScreen, etc.)
│   ├── layout/       # Layout components (ScreenContainer)
│   ├── navigation/   # Navigation components (TabBar, ControllerHeader)
│   ├── shows/        # Light show/preset editing screens
│   └── ui/           # shadcn/ui components (auto-generated, don't edit)
├── hooks/            # Custom React hooks (see Hooks section below)
├── lib/              # Utility functions
├── test/             # Test setup
└── types/            # TypeScript type definitions
```

### Hooks Organization

Hooks are organized by domain/feature:

```
src/hooks/
├── useQueryKeys.ts          # Centralized query key factory (import first)
├── useWled.ts               # Core WLED state queries and mutations
├── useWledWebSocket.ts      # WebSocket connection with auto-reconnect
├── usePresets.ts            # Preset CRUD operations
├── useDeviceSync.ts         # Device sync with live preview support
├── useSegmentOperations.ts  # Segment manipulation (update, merge, split, delete)
├── useControllers.ts        # Controller localStorage management
├── useSegmentDefinitions.ts # Global segment management
├── useSegmentFileSync.ts    # Segment file storage on controller
├── useSafeAreaInsets.ts     # Safe area CSS custom properties
└── useEffects.ts            # Effect metadata utilities
```

### Key Patterns

**Controller Management**: Controllers are stored in localStorage and managed via `useControllers` hook. Each controller has a unique ID, name, and URL.

**WLED API**: The `WledApi` class in `src/api/wled.ts` wraps the WLED JSON API. Hooks in `src/hooks/useWled.ts` provide React Query integration with per-controller query keys.

**Query Keys**: All WLED query keys follow the pattern `['wled', baseUrl, resource]`. Use `getQueryKeys(baseUrl)` from `useQueryKeys.ts` to get type-safe keys:
```tsx
import { getQueryKeys } from '@/hooks/useQueryKeys';
const keys = getQueryKeys(baseUrl);
// keys.state, keys.presets, keys.effects, keys.palettes, etc.
```

**Real-time Sync**: When viewing a controller, the app uses WebSocket (`ws://[host]/ws`) for instant state updates. The `useWledWebSocket` hook manages the connection with auto-reconnect. Home screen cards use HTTP polling (every 10s) to avoid exhausting WLED's 4-client WebSocket limit.

**Device Sync Hook**: The `useDeviceSync` hook manages local state editing with optional live preview:
- Tracks local state changes with `isDirty` flag
- In live preview mode, changes are sent via WebSocket immediately
- `revertToInitial()` restores the original state and reverts the device
- Used by `LightShowEditorScreen` for both current state and preset editing

**Segment Operations Hook**: The `useSegmentOperations` hook provides segment manipulation:
- `updateSegment(id, updates)` - Update a specific segment
- `mergeSegments(ids)` - Combine multiple segments
- `splitSegment(id, point)` - Split a segment at a LED index
- `deleteSegment(id)` - Remove a segment
- Uses state updater callbacks to avoid stale closure bugs

**PWA Support**: The app is installable as a Progressive Web App with offline support. The service worker caches app assets and provides runtime caching for fonts. PWA configuration is in vite.config.ts:12-89.

### Shared UI Components

Common components in `src/components/common/`:

**IMPORTANT**: Always import components directly from their files. Do NOT use barrel exports (index.ts files).

**Layout & Structure:**
- **PageHeader**: Standard page header with title, back button, and optional actions
  ```tsx
  import { PageHeader } from '@/components/common/PageHeader'
  <PageHeader title="Edit" subtitle="Living Room" onBack={handleBack} actions={<Button>Save</Button>} />
  ```

- **LoadingScreen**: Centered loading spinner with optional message
  ```tsx
  import { LoadingScreen } from '@/components/common/LoadingScreen'
  <LoadingScreen message="Loading presets..." />
  ```

- **ListSection / ListItem / ListItemWithIcon**: iOS-style grouped list sections
  ```tsx
  import { ListSection, ListItem } from '@/components/common/List'
  import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'

  <ListSection title="Settings">
    <ListItemWithIcon
      icon={Settings}
      title="Device Settings"
      subtitle="Configure your WLED"
      onClick={handleClick}
    />
  </ListSection>
  ```

**Feedback & States:**
- **EmptyState**: Consistent empty state with icon, title, description, optional action
  ```tsx
  import { EmptyState } from '@/components/common/EmptyState'
  <EmptyState
    icon={Sparkles}
    title="No Items Found"
    description="Get started by adding your first item"
    action={{ label: "Add Item", onClick: handleAdd }}
  />
  ```

- **ErrorState**: Error handling UI with retry functionality
  ```tsx
  import { ErrorState } from '@/components/common/ErrorState'
  <ErrorState
    title="Failed to load"
    message={error.message}
    onRetry={() => refetch()}
  />
  ```

- **InfoBox**: Standardized info/warning/muted message boxes
  ```tsx
  import { InfoBox } from '@/components/common/InfoBox'
  <InfoBox
    variant="info"  // "info" | "warning" | "muted"
    title="Note"
    description="This action cannot be undone"
    action={{ label: "Learn More", onClick: handleLearnMore }}
  />
  ```

**Dialogs:**
- **ConfirmationDialog**: Accessible confirmation dialogs (replaces window.confirm)
  ```tsx
  import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
  <ConfirmationDialog
    open={open}
    onOpenChange={setOpen}
    title="Delete Item?"
    description="This action cannot be undone."
    confirmLabel="Delete"
    confirmVariant="destructive"
    onConfirm={handleDelete}
  />
  ```

- **SimpleInputDialog**: Reduced boilerplate for text input dialogs
  ```tsx
  import { SimpleInputDialog } from '@/components/common/SimpleInputDialog'
  <SimpleInputDialog
    open={open}
    onOpenChange={setOpen}
    title="Create Group"
    fieldLabel="Group Name"
    placeholder="Enter name"
    onSubmit={handleCreate}
    submitLabel="Create"
  />
  ```

**Form Components:**
- **FormSection**: Grouped form fields with section headings
  ```tsx
  import { FormSection } from '@/components/common/FormSection'
  <FormSection title="Settings">
    <NumberField label="Count" value={count} onChange={setCount} />
  </FormSection>
  ```

- **ActionButtonBar**: Sticky footer with flexible button configuration
  ```tsx
  import { ActionButtonBar } from '@/components/common/ActionButtonBar'
  <ActionButtonBar
    buttons={[
      { label: "Cancel", variant: "outline", onClick: handleCancel },
      { label: "Save", icon: Save, onClick: handleSave, disabled: !isDirty }
    ]}
  />
  ```

- **RangeInput**: Labeled slider input for numeric values
  ```tsx
  import { RangeInput } from '@/components/common/RangeInput'
  ```

## Core Concepts & Vocabulary

### Controllers
Physical WLED devices that control LED strips. Each controller has:
- **Unique ID**: Generated when added to the app
- **Name**: User-provided label
- **URL**: IP address or hostname for API access
- **LED Count**: Total number of LEDs connected to the controller

Controllers are stored in localStorage and managed via the `useControllers` hook.

### Segments (WLED Segments)
WLED's native feature for dividing an LED strip into zones with independent effects and colors. Each segment has:
- **ID**: 0-9 (WLED supports max 10 segments)
- **Range**: Start and stop LED indices (both inclusive, e.g., 0-99 includes LEDs 0 through 99)
- **Effect**: Animation pattern (Solid, Rainbow, etc.)
- **Colors**: Up to 3 color slots (usage depends on effect)
- **Palette**: Color gradient used by palette-based effects
- **Parameters**: Speed, intensity, and custom parameters (varies by effect)

**Important**: WLED segment ranges use inclusive stop values. Segments [0-200] and [200-300] overlap on LED 200 and are invalid. Adjacent segments should be [0-199] and [200-300].

**Segment Repair**: When saving light shows, segments are automatically repaired to fix:
- Overlapping segments (truncates first segment to end before next)
- Out-of-bounds segments (truncates to ledCount - 1)
- Zero-length or invalid segments (removed)

See `repairSegments()` in `src/lib/segmentUtils.ts`.

### Global Segments
App-specific feature for managing reusable LED zone layouts. Unlike WLED segments (which control effects), global segments are structural templates:
- **Per-controller**: Each controller has its own global segments
- **Named zones**: e.g., "Living Room", "Ceiling", "Accent"
- **Grouped**: Segments can be organized into collapsible groups
- **Persistent**: Stored on the controller at `/wled-pro-segments.json` and cached in localStorage
- **Reusable**: Can be applied to light shows to quickly split a single segment into multiple zones

Global segments are managed via `useSegmentDefinitions` hook and stored using the file-based storage system in `useSegmentFileSync`.

**Workflow**: Define your physical LED layout once using global segments, then apply them to any light show to instantly create matching WLED segments.

### Effects
Animation patterns that control how LEDs change over time. Each effect has:
- **ID**: Numeric identifier (0 = Solid, 1 = Blink, etc.)
- **Name**: Display name (e.g., "Rainbow", "Fire 2012")
- **Parameters**: Speed, intensity, and custom sliders/checkboxes
- **Color slots**: Which of the 3 color slots the effect actually uses (some use 0, 1, 2, or 3)
- **Palette support**: Whether the effect uses a palette gradient
- **Flags**: 1D/2D support, audio reactivity

Effect metadata is parsed from `/json/fxdata` and typed in `src/lib/effects.ts`. The app uses this metadata to show only relevant colors and display palette previews when appropriate.

### Palettes
Color gradients used by palette-based effects. Two types:
- **Built-in palettes** (IDs 0-70): Predefined gradients like "Rainbow", "Ocean", "Lava"
  - Stored as `[position, r, g, b]` tuples defining gradient stops
- **Custom palettes**: User-defined gradients
  - Can reference segment colors ("c1", "c2", "c3")

Palette metadata is fetched from `/json/palx` and rendered using the `PaletteColorStrip` component.

### Light Shows (Presets)
Saved configurations that capture the complete state of all segments. Stored on the WLED device at `/presets.json`. Each preset includes:
- **Name**: User-provided label
- **Segments**: Array of segment configurations
- **Global settings**: Power state, brightness, transition time
- **Quick load label**: Optional 1-2 character shortcut

**Current State vs Presets**:
- **Current State**: The live, running configuration on the device
  - Editing current state applies changes immediately
  - Can be saved as a new preset
- **Presets**: Saved snapshots that can be loaded
  - Editing a preset uses "Live Preview" mode (optional immediate updates)
  - Save overwrites the preset, Save As creates a new one

**Create New Light Show**: Resets to a single segment covering the entire LED strip with default orange color, ready for customization.

### Segment vs Global Segment - Key Differences

| Aspect | WLED Segment | Global Segment |
|--------|--------------|----------------|
| Purpose | Controls effect/colors | Defines physical layout |
| Storage | WLED device state | `/wled-pro-segments.json` on controller |
| Lifespan | Part of current state or preset | Persistent template |
| Properties | Effect, colors, palette, speed, etc. | Just start, stop, name, group |
| Count | 0-10 per state/preset | Unlimited per controller |
| UI Location | Light Show Editor | Segments tab |
| Use Case | "Make LEDs 0-50 rainbow" | "LEDs 0-50 are the kitchen" |

## PWA Features

WLED Pro is installable as a Progressive Web App:

- **Offline Support**: Service worker caches all app assets for offline access
- **Install Prompt**: Users can install the app on mobile and desktop
- **Auto-Updates**: Service worker automatically updates to new versions
- **App Icons**: Adaptive icons for all platforms (regular and maskable)
- **Theme Color**: Matches app branding (#0ea5e9)

### Customizing Icons

To customize the PWA icons:
1. Edit `public/icon.svg` with your design
2. Run `npm run generate-icons` to regenerate all icon sizes
3. Icons are generated in multiple sizes:
   - 192x192 and 512x512 (standard)
   - 192x192 and 512x512 (maskable for Android)
   - 180x180 (Apple touch icon)
   - 32x32 (favicon)

### PWA Configuration

PWA settings are in vite.config.ts using vite-plugin-pwa:
- **Workbox**: Precaches all static assets
- **Runtime Caching**: Caches Google Fonts
- **Dev Mode**: PWA works in development (devOptions.enabled: true)

## Adding shadcn Components

Use the CLI to add new components:
```bash
npx shadcn@latest add [component-name]
```

Don't manually edit files in `src/components/ui/` - they're managed by shadcn.

## WLED API Reference

Detailed API documentation is in `docs/wled-api/`:

| Document | Contents |
|----------|----------|
| [overview.md](docs/wled-api/overview.md) | Endpoints, request/response format, partial updates, value modifiers |
| [state.md](docs/wled-api/state.md) | State object properties (power, brightness, nightlight, UDP sync) |
| [segments.md](docs/wled-api/segments.md) | Segment properties, LED ranges, colors, effects, individual LED control |
| [effects.md](docs/wled-api/effects.md) | Effect IDs, parameters, metadata format, categories |
| [palettes.md](docs/wled-api/palettes.md) | Built-in palettes (IDs 0-70), custom palette format |
| [info.md](docs/wled-api/info.md) | Read-only device info (LEDs, WiFi, hardware, capabilities) |
| [presets.md](docs/wled-api/presets.md) | Presets, playlists, quick load labels, preset cycling |
| [config.md](docs/wled-api/config.md) | Device configuration (hardware, network, defaults) |
| [nodes.md](docs/wled-api/nodes.md) | Node discovery for finding other WLED devices |
| [websocket.md](docs/wled-api/websocket.md) | WebSocket protocol, connection limits, message types |

### Quick Reference

**HTTP Endpoints**:
- `GET /json` - Full state (state + info + effects + palettes)
- `GET /json/si` - State + info only
- `GET /json/state` - Current state only
- `GET /json/info` - Device info
- `POST /json/state` - Update state

**WebSocket** (`ws://[host]/ws`):
- Receives state+info on connect and on any state change
- Send JSON state updates to control the device
- Send `{"v":true}` to request full state
- Max 4 concurrent connections per device

See https://kno.wled.ge/interfaces/json-api/ for upstream documentation.
