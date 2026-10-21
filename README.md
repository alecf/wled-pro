# WLED Pro

A modern UI for WLED built with React, TypeScript, and Vite.

## Features

- Power on/off control
- Brightness slider
- Device info display
- Real-time state sync via TanStack Query

## Development

```bash
# Install dependencies (requires Bun: https://bun.sh)
bun install

# Start dev server
bun run dev

# Run tests
bun run test

# Lint + format check (Biome)
bun run lint

# Build for production (includes TypeScript typecheck)
bun run build
```

## Connecting to WLED

By default, the app expects to be served from the WLED device itself (same origin). For development with a remote WLED device, you can configure the API base URL:

```typescript
import { setDefaultWledApi } from './api/wled'
setDefaultWledApi('http://192.168.1.100')
```

## Project Structure

```
src/
├── api/          # WLED API client
├── components/   # React components
├── hooks/        # Custom React hooks (useWled*)
├── test/         # Test setup
└── types/        # TypeScript type definitions
```

## Tech Stack

- React 19
- TypeScript
- Vite
- TanStack React Query
- Vitest + Testing Library
