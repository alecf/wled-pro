/**
 * MSW adapter: exposes a FakeWled at `baseUrl` (HTTP) and `ws://<host>/ws`.
 */
import { HttpResponse, http, ws } from 'msw'
import type { FakeWled } from '../FakeWled'
import { handleFetch } from './fetch'

export function createWledHandlers(sim: FakeWled, { baseUrl }: { baseUrl: string }) {
  const origin = new URL(baseUrl)
  const wsProtocol = origin.protocol === 'https:' ? 'wss:' : 'ws:'
  const link = ws.link(`${wsProtocol}//${origin.host}/ws`)

  return [
    http.all(`${origin.origin}/*`, async ({ request }) => {
      const res = await handleFetch(sim, request)
      if (res.networkError) return HttpResponse.error()
      return new HttpResponse(res.body ?? null, { status: res.status, headers: res.headers })
    }),
    link.addEventListener('connection', ({ client }) => {
      const conn = sim.connect({
        send: (message) => client.send(message),
        close: () => client.close(),
      })
      client.addEventListener('message', (event) => conn.receive(String(event.data)))
      client.addEventListener('close', () => conn.close())
    }),
  ]
}
