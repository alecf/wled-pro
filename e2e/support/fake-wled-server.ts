/**
 * Real HTTP + WebSocket server around a FakeWled, for Playwright and manual dev.
 * Runs on Node (Playwright) and Bun (scripts/fake-wled.ts).
 *
 * Besides the WLED API it exposes control routes for scripts/curl:
 *   GET  /__sim/snapshot          -> state/info/cfg/presets/files
 *   POST /__sim/state  {...}      -> apply an external state change (broadcasts)
 *   POST /__sim/reset             -> sim.reset()
 *   POST /__sim/offline?ms=1500   -> go offline (omit ms for "until reset")
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer } from 'ws'
import { handleFetch } from '../../src/test/fake-wled/adapters/fetch'
import type { FakeWled } from '../../src/test/fake-wled/FakeWled'

export interface FakeWledServer {
  /** e.g. "http://127.0.0.1:53211" */
  url: string
  port: number
  close(): Promise<void>
}

export async function startFakeWledServer({
  sim,
  port = 0,
  host = '127.0.0.1',
}: {
  sim: FakeWled
  port?: number
  host?: string
}): Promise<FakeWledServer> {
  const wss = new WebSocketServer({ noServer: true })

  const server = createServer((req, res) => {
    handleHttp(sim, req, res).catch((err) => {
      res.statusCode = 500
      res.end(String(err))
    })
  })

  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname
    if (path !== '/ws' || sim.isOffline) {
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, (client) => {
      const conn = sim.connect({
        send: (message) => client.send(message),
        close: () => client.close(),
      })
      client.on('message', (data) => conn.receive(data.toString()))
      client.on('close', () => conn.close())
    })
  })

  await new Promise<void>((resolve) => server.listen(port, host, resolve))
  const actualPort = (server.address() as AddressInfo).port

  return {
    url: `http://${host}:${actualPort}`,
    port: actualPort,
    close: () =>
      new Promise<void>((resolve) => {
        for (const client of wss.clients) client.terminate()
        wss.close()
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}

async function handleHttp(sim: FakeWled, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const body = await readBody(req)

  if (url.pathname.startsWith('/__sim/')) {
    handleControl(sim, url, body, res)
    return
  }

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  const method = req.method ?? 'GET'
  const request = new Request(url, {
    method,
    headers,
    body:
      method === 'GET' || method === 'HEAD' || body.length === 0 ? undefined : new Uint8Array(body),
  })
  const simRes = await handleFetch(sim, request)
  if (simRes.networkError) {
    // Look like an unreachable device: drop the connection without answering.
    req.socket.destroy()
    return
  }
  res.writeHead(simRes.status, simRes.headers)
  res.end(simRes.body ?? '')
}

function handleControl(sim: FakeWled, url: URL, body: Buffer, res: ServerResponse) {
  const send = (status: number, value: unknown) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify(value))
  }
  switch (url.pathname) {
    case '/__sim/snapshot':
      return send(200, sim.snapshot())
    case '/__sim/state':
      sim.applyState(JSON.parse(body.toString() || '{}'))
      return send(200, sim.state)
    case '/__sim/reset':
      sim.reset()
      return send(200, { success: true })
    case '/__sim/offline': {
      const ms = url.searchParams.get('ms')
      sim.goOffline(ms ? Number(ms) : undefined)
      return send(200, { success: true })
    }
  }
  send(404, { error: 'unknown control route' })
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
