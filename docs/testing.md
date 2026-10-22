# Testing

## Fake WLED device

`src/test/fake-wled/` is a stateful simulator of a WLED controller (HTTP JSON API,
`/presets.json`, `/edit` uploads, `/json/cfg`, `/reset`, and the `/ws` WebSocket).
The core (`FakeWled`) knows nothing about transport; adapters expose it to Vitest
(MSW), Playwright (a real `node:http` + `ws` server) and manual development.

It implements WLED's semantics independently of the app (it does **not** reuse
`src/lib/wled-state.ts`), so tests catch disagreements between the app and the device.
Notable behaviour: segment `stop` is **exclusive**, segment ids are slot indices
(deleting leaves an inactive slot; unknown ids append at the next slot; deleting half of 4+
slots at once purges and renumbers, see `docs/wled-api/segments.md`), `POST /json/state` answers `{"success":true}` unless the body has
`v: true`, `psave` stores bounds/brightness only with `sb`/`ib`, and every state change
broadcasts `{state, info}` to all WebSocket clients (including the sender), and
`/json/palx` reports `m` as the **last page index** (not a page count), clamping
out-of-range pages to it.

Model new device behaviour from `docs/wled-api/` or WLED's source, never from what the
app currently sends or expects: a fake that copies the app's assumptions hides exactly
the bugs it exists to catch. When the fake exposes an app bug, pin it with `it.fails`
plus a `// BUG:` comment instead of bending the fake.

Default fixture (`fixtures/minimal.ts`): 150 LEDs, 3 segments (Left/Middle/Right),
10 effects with `fxdata`, 10 palettes (2 `palx` pages), presets 1 "Warm White",
2 "Party", 3 "Cycle" (playlist). Override with `new FakeWled({ overrides: {...} })`
(deep merge, arrays replace) and the helpers in `fixtures/builders.ts`.

Useful API:

```ts
sim.state / sim.info / sim.cfg / sim.presets / sim.files   // live, assert directly
sim.applyState({ seg: [{ id: 0, fx: 9 }] })                // external change; broadcasts over WS
sim.requests / sim.stateUpdates()                          // recorder (HTTP + WS)
// stateUpdates() = mutations the app sent that the device accepted (not applyState(),
// not requests answered by fail()/offline; those stay in sim.requests with failed: true)
await sim.waitForRequest('/edit'); await sim.waitForState((s) => s.bri === 40)
sim.fail('/edit', { status: 500, times: 1 }); sim.fail(/^\/json/, { networkError: true })
sim.latency({ match: '/json/info', ms: 300 }); sim.goOffline(1500); sim.dropWsClients()
sim.reset(); sim.snapshot()
```

### Vitest

```ts
import { useFakeWled } from '@/test/fake-wled/adapters/vitest'

const device = useFakeWled() // MSW server per file, reset after each test

it('sends brightness', async () => {
  const { result } = renderHook(() => useWledWebSocket(device.baseUrl), {
    wrapper: device.wrapper(), // fresh QueryClient
  })
  await waitFor(() => expect(result.current.status).toBe('connected'))
  act(() => result.current.setBrightness(40))
  await device.sim.waitForState((s) => s.bri === 40)
})
```

Unhandled requests fail the test. While active, the helper wraps `fetch` to rebuild jsdom
`FormData` bodies as Node `FormData`, keeping each file's filename (Vitest's own jsdom
conversion drops it, and WLED's `/edit` uses the filename as the target path). This covers
`fetch(url, { body })` only, not `fetch(new Request(url, { body }))`; XHR uploads are unaffected.
Integration tests live in `src/test/integration/*.integration.test.ts(x)`.

### Playwright

```ts
import { expect, test } from './support/fixtures'

test('...', async ({ page, wled, device }) => {
  await page.goto('/') // `device` seeded localStorage with the fake controller
  await expect.poll(() => wled.state.bri).toBe(255)
  wled.applyState({ bri: 51 }) // pushed to the page over WebSocket
})
```

Each worker starts its own server on a random port; `wled` is reset before every test.
Service workers are blocked so the PWA cache doesn't interfere. Run locally with a
preinstalled Chromium:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium bunx playwright test
```

### Manual development

```bash
bun scripts/fake-wled.ts --port 8787 --downtime 1500
bun run dev   # then add http://127.0.0.1:8787 as a controller
```

Control routes: `GET /__sim/snapshot`, `POST /__sim/state` (JSON body, applied as an
external change), `POST /__sim/reset`, `POST /__sim/offline?ms=1500`.

### Not simulated (yet)

Pixel rendering and `/json/live`, `ps` range syntax, playlist timing/advance, timers,
nightlight countdown, UDP/E1.31/MQTT, 2D specifics, usermods, the legacy `/win` API and
OTA PIN enforcement. Follow-ups: a capture script that records a real device into a
realistic fixture (~180 effects, ~70 palettes), and a `page.route`/`routeWebSocket`
adapter for portless, deterministic e2e fault injection.
