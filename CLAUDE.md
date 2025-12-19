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

**State Sync**: React Query handles polling and cache invalidation. Controller state refreshes every 5 seconds, individual state every 1 second when viewing a controller.

## Adding shadcn Components

Use the CLI to add new components:
```bash
npx shadcn@latest add [component-name]
```

Don't manually edit files in `src/components/ui/` - they're managed by shadcn.

## WLED API Reference

The app communicates with WLED via its JSON API:
- `GET /json` - Full state (state + info + effects + palettes)
- `GET /json/state` - Current state only
- `GET /json/info` - Device info
- `POST /json/state` - Update state

See https://kno.wled.ge/interfaces/json-api/ for full API documentation.
