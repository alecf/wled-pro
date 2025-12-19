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

The app communicates with WLED via its JSON API and WebSocket:

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

See https://kno.wled.ge/interfaces/json-api/ and https://kno.wled.ge/interfaces/websocket/ for full API documentation.
