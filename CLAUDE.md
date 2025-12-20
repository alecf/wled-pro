# WLED Pro

A modern UI for WLED LED controllers built with React, TypeScript, and Vite.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npm test         # Run tests (watch mode)
npm run test:coverage  # Run tests with coverage
```

## Architecture

### Tech Stack
- React 19 + TypeScript
- Vite (build tool)
- TanStack React Query (server state management)
- Tailwind CSS v4 + shadcn/ui (styling)
- Vitest + Testing Library (testing)

### Project Structure
```
src/
├── api/          # WLED API client
├── components/   # React components
│   └── ui/       # shadcn/ui components (auto-generated, don't edit)
├── hooks/        # Custom React hooks
├── lib/          # Utility functions
├── test/         # Test setup
└── types/        # TypeScript type definitions
```

### Key Patterns

**Controller Management**: Controllers are stored in localStorage and managed via `useControllers` hook. Each controller has a unique ID, name, and URL.

**WLED API**: The `WledApi` class in `src/api/wled.ts` wraps the WLED JSON API. Hooks in `src/hooks/useWled.ts` provide React Query integration with per-controller query keys.

**Real-time Sync**: When viewing a controller, the app uses WebSocket (`ws://[host]/ws`) for instant state updates. The `useWledWebSocket` hook manages the connection with auto-reconnect. Home screen cards use HTTP polling (every 10s) to avoid exhausting WLED's 4-client WebSocket limit.

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
