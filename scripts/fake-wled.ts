/**
 * Start a fake WLED device for manual development.
 *
 *   bun scripts/fake-wled.ts [--port 8787] [--downtime 1500]
 *
 * Then add http://127.0.0.1:8787 as a controller in `bun run dev`.
 * Control routes: GET /__sim/snapshot, POST /__sim/state, /__sim/reset, /__sim/offline?ms=N
 */
import { startFakeWledServer } from '../e2e/support/fake-wled-server'
import { FakeWled } from '../src/test/fake-wled/FakeWled'

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? Number(process.argv[i + 1]) : fallback
}

const sim = new FakeWled({ rebootDowntimeMs: arg('downtime', 1500) })
const server = await startFakeWledServer({ sim, port: arg('port', 8787), host: '0.0.0.0' })
console.log(`Fake WLED listening on http://127.0.0.1:${server.port} (ws at /ws)`)

sim.on('request', (r) => {
  if (r.via !== 'external') console.log(`${r.via.toUpperCase()} ${r.method} ${r.path}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close().then(() => process.exit(0))
  })
}
