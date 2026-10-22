/**
 * HTTP path table for the fake device: SimRequest -> SimResponse.
 */
import type { FakeWled } from './FakeWled'
import { isStatePath } from './matcher'
import { isPlainObject, parseJson } from './semantics/values'
import type { JsonObject, SimRequest, SimResponse } from './types'

const PALX_PAGE_SIZE = 8

function json(value: unknown, status = 200): SimResponse {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  }
}

function text(body: string, status = 200, contentType = 'text/plain'): SimResponse {
  return { status, headers: { 'Content-Type': contentType }, body }
}

const notFound = () => text('Not Found', 404)

export function route(sim: FakeWled, req: SimRequest): SimResponse {
  if (req.method === 'GET' || req.method === 'HEAD') return routeGet(sim, req)
  if (req.method === 'POST') return routePost(sim, req)
  return text('Method Not Allowed', 405)
}

function routeGet(sim: FakeWled, req: SimRequest): SimResponse {
  switch (req.path) {
    case '/json':
      return json({
        state: sim.state,
        info: sim.info,
        effects: sim.effects,
        palettes: sim.palettes,
      })
    case '/json/state':
      return json(sim.state)
    case '/json/info':
      return json(sim.info)
    case '/json/si':
      return json({ state: sim.state, info: sim.info })
    case '/json/eff':
      return json(sim.effects)
    case '/json/pal':
      return json(sim.palettes)
    case '/json/fxdata':
      return json(sim.fxdata)
    case '/json/palx':
      return json(palxPage(sim, Number(req.query.get('page') ?? 0)))
    case '/json/nodes':
      return json(sim.nodes)
    case '/json/net':
      return json(sim.net)
    case '/json/cfg':
    case '/cfg.json':
      return json(sim.cfg)
    case '/presets.json':
      return json(sim.presets)
  }
  const file = sim.files.get(req.path)
  if (file !== undefined) {
    return text(file, 200, req.path.endsWith('.json') ? 'application/json' : 'text/plain')
  }
  return notFound()
}

function routePost(sim: FakeWled, req: SimRequest): SimResponse {
  if (isStatePath(req.path)) {
    const body = parseJsonBody(req)
    if (!body) return json({ error: 9 }, 400)
    sim.applyStateInternal(body)
    const wantsState = body.v === true || sim.options.postResponse === 'state'
    if (!wantsState) return json({ success: true })
    return json(req.path === '/json/si' ? { state: sim.state, info: sim.info } : sim.state)
  }

  switch (req.path) {
    case '/json/cfg': {
      const body = parseJsonBody(req)
      if (!body) return json({ error: 9 }, 400)
      sim.applyConfig(body)
      return json({ success: true })
    }
    case '/edit':
      return handleUpload(sim, req)
    case '/reset': {
      const fields = formFields(req)
      if (fields.FR === '1') sim.factoryReset()
      sim.reboot()
      return text('Rebooting...', 200, 'text/html')
    }
    case '/update':
      sim.reboot()
      return text('Update successful! Rebooting...', 200, 'text/html')
  }
  return notFound()
}

function handleUpload(sim: FakeWled, req: SimRequest): SimResponse {
  if (!req.body || typeof req.body === 'string' || req.body.files.length === 0) {
    return text('Bad Request', 400)
  }
  const uploads = req.body.files.map((file) => {
    const path = file.filename.startsWith('/') ? file.filename : `/${file.filename}`
    const isJsonStore = path === '/presets.json' || path === '/cfg.json'
    return { path, text: file.text, parsed: isJsonStore ? parseJson(file.text) : undefined }
  })
  // Validate every file before applying any, so a bad upload changes nothing.
  for (const u of uploads) {
    if ((u.path === '/presets.json' || u.path === '/cfg.json') && !isPlainObject(u.parsed)) {
      return text('Bad Request', 400)
    }
  }
  for (const u of uploads) {
    if (u.path === '/presets.json') sim.presets = u.parsed as FakeWled['presets']
    else if (u.path === '/cfg.json') sim.cfg = u.parsed as JsonObject
    else sim.files.set(u.path, u.text)
  }
  return text('File Uploaded!', 200)
}

function palxPage(sim: FakeWled, page: number) {
  const ids = Object.keys(sim.palx)
    .map(Number)
    .sort((a, b) => a - b)
  // Like WLED, `m` is the last page index (not the page count) and out-of-range
  // pages are clamped to it.
  const m = Math.max(0, Math.ceil(ids.length / PALX_PAGE_SIZE) - 1)
  const p: Record<string, unknown> = {}
  const safePage = Number.isFinite(page) && page >= 0 ? Math.min(Math.floor(page), m) : 0
  for (const id of ids.slice(safePage * PALX_PAGE_SIZE, (safePage + 1) * PALX_PAGE_SIZE)) {
    p[String(id)] = sim.palx[String(id)]
  }
  return { m, p }
}

function parseJsonBody(req: SimRequest): JsonObject | null {
  if (typeof req.body !== 'string') return null
  const parsed = parseJson(req.body)
  return isPlainObject(parsed) ? parsed : null
}

function formFields(req: SimRequest): Record<string, string> {
  if (!req.body) return {}
  if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body))
  return req.body.fields
}
