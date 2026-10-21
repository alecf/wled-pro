import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeWled } from './FakeWled'
import { withSegments } from './fixtures/builders'
import { MINIMAL_EFFECTS, MINIMAL_LED_COUNT, MINIMAL_PALETTES } from './fixtures/minimal'
import type { SimRequest, SimResponse } from './types'

function req(method: string, url: string, body?: SimRequest['body']): SimRequest {
  const u = new URL(url, 'http://fake')
  return { method, path: u.pathname, query: u.searchParams, headers: {}, body }
}

async function get(sim: FakeWled, url: string) {
  const res = await sim.handle(req('GET', url))
  const isJson = res.headers?.['Content-Type'] === 'application/json'
  return { res, json: isJson && res.body ? JSON.parse(res.body) : undefined }
}

async function post(sim: FakeWled, url: string, body: unknown): Promise<SimResponse> {
  return sim.handle(req('POST', url, typeof body === 'string' ? body : JSON.stringify(body)))
}

function upload(sim: FakeWled, filename: string, text: string) {
  return sim.handle(
    req('POST', '/edit', { files: [{ field: 'data', filename, text }], fields: {} }),
  )
}

function wsClient(sim: FakeWled) {
  const received: { state: FakeWled['state']; info: FakeWled['info'] }[] = []
  const client = { send: (m: string) => received.push(JSON.parse(m)), close: vi.fn() }
  const conn = sim.connect(client)
  return { received, client, conn, send: (m: unknown) => conn.receive(JSON.stringify(m)) }
}

describe('FakeWled', () => {
  let sim: FakeWled
  beforeEach(() => {
    sim = new FakeWled()
  })

  describe('read endpoints', () => {
    it('serves /json with state, info, effects and palettes', async () => {
      const { res, json } = await get(sim, '/json')
      expect(res.status).toBe(200)
      expect(json.effects).toEqual(MINIMAL_EFFECTS)
      expect(json.palettes).toEqual(MINIMAL_PALETTES)
      expect(json.info.fxcount).toBe(MINIMAL_EFFECTS.length)
      expect(json.state.seg).toHaveLength(3)
    })

    it('pages /json/palx in pages of 8 and reports the page count', async () => {
      const page0 = (await get(sim, '/json/palx?page=0')).json
      const page1 = (await get(sim, '/json/palx?page=1')).json
      expect(page0.m).toBe(2)
      expect(Object.keys(page0.p)).toHaveLength(8)
      expect(Object.keys(page1.p)).toEqual(['8', '9'])
    })

    it('returns 404 for unknown files and serves uploaded ones', async () => {
      expect((await get(sim, '/wled-pro-segments.json')).res.status).toBe(404)
      await upload(sim, '/wled-pro-segments.json', '{"a":1}')
      const { res, json } = await get(sim, '/wled-pro-segments.json')
      expect(res.status).toBe(200)
      expect(json).toEqual({ a: 1 })
    })

    it('adds CORS headers and answers preflight', async () => {
      const pre = await sim.handle(req('OPTIONS', '/json/state'))
      expect(pre.status).toBe(204)
      expect(pre.headers?.['Access-Control-Allow-Origin']).toBe('*')
      expect((await get(sim, '/json/info')).res.headers?.['Access-Control-Allow-Origin']).toBe('*')
    })
  })

  describe('POST /json/state top level', () => {
    it('answers {success:true} by default and the full state with v:true', async () => {
      const a = await post(sim, '/json/state', { bri: 10 })
      expect(JSON.parse(a.body ?? '')).toEqual({ success: true })
      const b = await post(sim, '/json/state', { bri: 20, v: true })
      expect(JSON.parse(b.body ?? '').bri).toBe(20)
    })

    it('rejects malformed JSON with 400', async () => {
      expect((await post(sim, '/json/state', '{nope')).status).toBe(400)
    })

    it('toggles with on:"t"', async () => {
      await post(sim, '/json/state', { on: 't' })
      expect(sim.state.on).toBe(false)
      await post(sim, '/json/state', { on: 't' })
      expect(sim.state.on).toBe(true)
    })

    it('bri:0 turns off but keeps the last brightness; non-zero bri turns on', async () => {
      await post(sim, '/json/state', { bri: 0 })
      expect(sim.state).toMatchObject({ on: false, bri: 128 })
      await post(sim, '/json/state', { bri: 60 })
      expect(sim.state).toMatchObject({ on: true, bri: 60 })
    })

    it('supports relative brightness and clamps', async () => {
      await post(sim, '/json/state', { bri: '~-28' })
      expect(sim.state.bri).toBe(100)
      await post(sim, '/json/state', { bri: '~500' })
      expect(sim.state.bri).toBe(255)
    })

    it('manual changes clear the active preset', async () => {
      await post(sim, '/json/state', { ps: 1 })
      expect(sim.state.ps).toBe(1)
      await post(sim, '/json/state', { transition: 3 })
      expect(sim.state.ps).toBe(-1)
    })
  })

  describe('segments', () => {
    it('updates a segment by id', async () => {
      await post(sim, '/json/state', { seg: [{ id: 2, fx: 5, sx: 10 }] })
      expect(sim.state.seg[2]).toMatchObject({ fx: 5, sx: 10 })
      expect(sim.state.seg[0].fx).toBe(0)
    })

    it('uses the array index as id when id is omitted', async () => {
      await post(sim, '/json/state', { seg: [{}, { pal: 3 }] })
      expect(sim.state.seg[1].pal).toBe(3)
    })

    it('applies an object without id to selected segments (or mainseg)', async () => {
      await post(sim, '/json/state', { seg: { fx: 4 } })
      expect(sim.state.seg.map((s) => s.fx)).toEqual([4, 9, 2])
      await post(sim, '/json/state', {
        seg: [
          { id: 0, sel: false },
          { id: 2, sel: true },
        ],
      })
      await post(sim, '/json/state', { seg: { fx: 7 } })
      expect(sim.state.seg.map((s) => s.fx)).toEqual([4, 9, 7])
    })

    it('replaces colour slots partially', async () => {
      await post(sim, '/json/state', { seg: [{ id: 0, col: [[], [1, 2, 3]] }] })
      expect(sim.state.seg[0].col).toEqual([
        [255, 160, 0],
        [1, 2, 3],
        [0, 0, 0],
      ])
      await post(sim, '/json/state', { seg: [{ id: 0, col: ['FF0000'] }] })
      expect(sim.state.seg[0].col[0]).toEqual([255, 0, 0])
    })

    it('treats stop as exclusive and keeps len in sync', async () => {
      await post(sim, '/json/state', { seg: [{ id: 0, start: 0, stop: 40 }] })
      expect(sim.state.seg[0]).toMatchObject({ start: 0, stop: 40, len: 40 })
      await post(sim, '/json/state', { seg: [{ id: 2, len: 10 }] })
      expect(sim.state.seg[2]).toMatchObject({ start: 100, stop: 110, len: 10 })
    })

    it('clamps stop to the LED count', async () => {
      await post(sim, '/json/state', { seg: [{ id: 2, stop: 999 }] })
      expect(sim.state.seg[2].stop).toBe(MINIMAL_LED_COUNT)
    })

    it('deletes a segment with stop:0 and renumbers the rest', async () => {
      await post(sim, '/json/state', { seg: [{ id: 1, stop: 0 }] })
      expect(sim.state.seg.map((s) => [s.id, s.n])).toEqual([
        [0, 'Left'],
        [1, 'Right'],
      ])
      expect((sim.info.leds as { seglc?: number[] }).seglc).toHaveLength(2)
    })

    it('never deletes the last segment', async () => {
      sim = new FakeWled({ overrides: { state: { seg: withSegments(1) } } })
      await post(sim, '/json/state', { seg: [{ id: 0, stop: 0 }] })
      expect(sim.state.seg).toHaveLength(1)
    })

    it('creates a segment for an unknown id with a valid range, up to maxseg', async () => {
      await post(sim, '/json/state', { seg: [{ id: 3, start: 0, stop: 10, fx: 1 }] })
      expect(sim.state.seg[3]).toMatchObject({ id: 3, start: 0, stop: 10, fx: 1 })
      await post(sim, '/json/state', { seg: [{ id: 4 }] })
      expect(sim.state.seg).toHaveLength(4)
      sim = new FakeWled({ overrides: { info: { leds: { maxseg: 3 } } } })
      await post(sim, '/json/state', { seg: [{ id: 3, start: 0, stop: 10 }] })
      expect(sim.state.seg).toHaveLength(3)
    })

    it('supports fx/pal modifiers with wrap-around and clamping', async () => {
      await post(sim, '/json/state', { seg: [{ id: 1, fx: '~' }] })
      expect(sim.state.seg[1].fx).toBe(0) // 9 is the last effect: wraps
      await post(sim, '/json/state', { seg: [{ id: 1, fx: '~-' }] })
      expect(sim.state.seg[1].fx).toBe(9)
      await post(sim, '/json/state', { seg: [{ id: 1, pal: 500 }] })
      expect(sim.state.seg[1].pal).toBe(MINIMAL_PALETTES.length - 1)
      sim = new FakeWled({ random: () => 0 })
      await post(sim, '/json/state', { seg: [{ id: 1, fx: 'r' }] })
      expect(sim.state.seg[1].fx).toBe(0)
    })
  })

  describe('presets and playlists', () => {
    it('psave snapshots segments without bounds or brightness by default', async () => {
      await post(sim, '/json/state', { seg: [{ id: 0, fx: 3 }] })
      await post(sim, '/json/state', { psave: 7, n: 'Mine', ql: 'M' })
      const preset = sim.presets['7'] as unknown as Record<string, unknown> & { seg: object[] }
      expect(preset).toMatchObject({ n: 'Mine', ql: 'M', on: true })
      expect(preset.bri).toBeUndefined()
      expect(preset.seg[0]).toMatchObject({ id: 0, fx: 3 })
      expect(preset.seg[0]).not.toHaveProperty('start')
      expect(sim.state.ps).toBe(7)
    })

    it('psave with ib/sb includes brightness and bounds', async () => {
      await post(sim, '/json/state', { psave: 8, n: 'Full', ib: true, sb: true })
      const preset = sim.presets['8'] as { bri: number; seg: object[] }
      expect(preset.bri).toBe(128)
      expect(preset.seg[2]).toMatchObject({ start: 100, stop: 150 })
    })

    it('/presets.json reflects saves and deletes', async () => {
      await post(sim, '/json/state', { psave: 9, n: 'Nine' })
      expect((await get(sim, '/presets.json')).json['9'].n).toBe('Nine')
      await post(sim, '/json/state', { pdel: 9 })
      expect((await get(sim, '/presets.json')).json['9']).toBeUndefined()
    })

    it('ps applies the preset and sets state.ps', async () => {
      await post(sim, '/json/state', { ps: 2 })
      expect(sim.state).toMatchObject({ ps: 2, bri: 255 })
      expect(sim.state.seg).toHaveLength(1)
      expect(sim.state.seg[0]).toMatchObject({ start: 0, stop: 150, fx: 9, pal: 6 })
    })

    it('ignores ps range syntax', async () => {
      await post(sim, '/json/state', { ps: '1~2~' })
      expect(sim.state.ps).toBe(-1)
    })

    it('loading a playlist preset starts the playlist; pl:-1 stops it', async () => {
      await post(sim, '/json/state', { ps: 3 })
      expect(sim.state.pl).toBe(3)
      expect(sim.state.ps).toBe(1) // first entry loaded
      await post(sim, '/json/state', { pl: -1 })
      expect(sim.state.pl).toBe(-1)
    })

    it('playlist with psave is saved, not started', async () => {
      const playlist = { ps: [1, 2], dur: [10, 10] }
      await post(sim, '/json/state', { psave: 12, n: 'PL', playlist })
      expect(sim.presets['12']).toEqual({ n: 'PL', playlist })
      expect(sim.state.pl).toBe(-1)
    })

    it('uploading /presets.json through /edit replaces the preset map', async () => {
      await upload(sim, '/presets.json', '{}')
      expect(sim.presets).toEqual({})
      expect((await get(sim, '/presets.json')).json).toEqual({})
    })
  })

  describe('config', () => {
    it('deep-merges cfg, replaces arrays and updates info side effects', async () => {
      const res = await post(sim, '/json/cfg', {
        id: { name: 'Renamed' },
        timers: { ins: [{ en: 1, hour: 7, min: 0, macro: 1, dow: 127 }] },
        hw: { led: { total: 60 } },
      })
      expect(JSON.parse(res.body ?? '')).toEqual({ success: true })
      const cfg = (await get(sim, '/json/cfg')).json
      expect(cfg.id).toEqual({ mdns: 'fake-wled', name: 'Renamed', inv: 'Light' })
      expect(cfg.timers.ins).toHaveLength(1)
      expect(cfg.timers.cntdwn).toBeDefined()
      expect(sim.info.name).toBe('Renamed')
      expect(sim.info.leds.count).toBe(60)
    })

    it('stores password lengths instead of passwords', async () => {
      await post(sim, '/json/cfg', { ap: { psk: 'secret12345' } })
      expect((sim.cfg.ap as Record<string, unknown>).pskl).toBe(11)
      expect(sim.cfg.ap).not.toHaveProperty('psk')
    })
  })

  describe('websocket', () => {
    it('sends {state, info} on connect and on {v:true}', () => {
      const ws = wsClient(sim)
      expect(ws.received).toHaveLength(1)
      expect(ws.received[0].state.bri).toBe(128)
      ws.send({ v: true })
      expect(ws.received).toHaveLength(2)
    })

    it('broadcasts every change to all clients, including the sender', async () => {
      const a = wsClient(sim)
      const b = wsClient(sim)
      a.send({ bri: 42 })
      expect(a.received.at(-1)?.state.bri).toBe(42)
      expect(b.received.at(-1)?.state.bri).toBe(42)
      await post(sim, '/json/state', { on: false })
      expect(b.received.at(-1)?.state.on).toBe(false)
      sim.applyState({ seg: [{ id: 0, fx: 8 }] })
      expect(a.received.at(-1)?.state.seg[0].fx).toBe(8)
    })

    it('ignores malformed messages', () => {
      const ws = wsClient(sim)
      ws.conn.receive('not json')
      expect(ws.received).toHaveLength(1)
    })

    it('drops the oldest client past maxWsClients', () => {
      sim = new FakeWled({ maxWsClients: 2 })
      const a = wsClient(sim)
      wsClient(sim)
      wsClient(sim)
      expect(a.client.close).toHaveBeenCalled()
      expect(sim.wsClientCount).toBe(2)
    })

    it('stops broadcasting to clients that closed', () => {
      const a = wsClient(sim)
      a.conn.close()
      sim.applyState({ bri: 1 })
      expect(a.received).toHaveLength(1)
    })
  })

  describe('recorder', () => {
    it('records HTTP and WS state updates in order', async () => {
      const ws = wsClient(sim)
      await post(sim, '/json/state', { bri: 5 })
      ws.send({ v: true })
      ws.send({ on: true })
      expect(sim.stateUpdates()).toEqual([{ bri: 5 }, { on: true }])
      expect(sim.requests.map((r) => r.via)).toEqual(['http', 'ws', 'ws'])
    })

    it('waitForRequest and waitForState resolve on future events', async () => {
      const wait = sim.waitForRequest('/json/cfg')
      const waitState = sim.waitForState((s) => s.bri === 77)
      await post(sim, '/json/cfg', {})
      sim.applyState({ bri: 77 })
      await expect(wait).resolves.toMatchObject({ method: 'POST', path: '/json/cfg' })
      await expect(waitState).resolves.toMatchObject({ bri: 77 })
    })

    it('waitForState rejects after the timeout', async () => {
      await expect(sim.waitForState(() => false, { timeout: 10 })).rejects.toThrow(/timed out/)
    })
  })

  describe('faults', () => {
    it('fails matching requests a limited number of times', async () => {
      sim.fail('/edit', { status: 500, times: 1 })
      expect((await upload(sim, '/x.json', '1')).status).toBe(500)
      expect((await upload(sim, '/x.json', '1')).status).toBe(200)
    })

    it('can fail at the network level and match by RegExp', async () => {
      sim.fail(/^\/json\//, { networkError: true })
      expect((await get(sim, '/json/info')).res.networkError).toBe(true)
      expect((await get(sim, '/presets.json')).res.status).toBe(200)
    })

    it('adds latency', async () => {
      vi.useFakeTimers()
      try {
        sim.latency({ match: '/json/info', ms: 500 })
        let done = false
        const p = get(sim, '/json/info').then(() => {
          done = true
        })
        await vi.advanceTimersByTimeAsync(499)
        expect(done).toBe(false)
        await vi.advanceTimersByTimeAsync(1)
        await p
        expect(done).toBe(true)
      } finally {
        vi.useRealTimers()
      }
    })

    it('goOffline refuses HTTP and WS until it expires', async () => {
      let now = 1000
      sim = new FakeWled({ now: () => now })
      const ws = wsClient(sim)
      sim.goOffline(100)
      expect(ws.client.close).toHaveBeenCalled()
      expect((await get(sim, '/json/info')).res.networkError).toBe(true)
      const refused = { send: vi.fn(), close: vi.fn() }
      sim.connect(refused)
      expect(refused.close).toHaveBeenCalled()
      now += 100
      expect((await get(sim, '/json/info')).res.status).toBe(200)
    })
  })

  describe('reboot and reset', () => {
    it('/reset drops WS clients and goes offline for rebootDowntimeMs', async () => {
      let now = 0
      sim = new FakeWled({ rebootDowntimeMs: 1500, now: () => now })
      const ws = wsClient(sim)
      const res = await sim.handle(req('POST', '/reset'))
      expect(res.status).toBe(200)
      expect(ws.client.close).toHaveBeenCalled()
      expect((await get(sim, '/json/info')).res.networkError).toBe(true)
      now = 1500
      expect((await get(sim, '/json/info')).res.status).toBe(200)
    })

    it('FR=1 restores fixture defaults, ignoring overrides', async () => {
      sim = new FakeWled({ overrides: { info: { name: 'Custom' } } })
      await post(sim, '/json/state', { psave: 20, n: 'Gone' })
      await sim.handle(req('POST', '/reset', 'FR=1'))
      expect(sim.presets['20']).toBeUndefined()
      expect(sim.info.name).toBe('Fake WLED')
    })

    it('reset() restores the fixture with overrides and clears the recorder and faults', async () => {
      sim = new FakeWled({ overrides: { state: { bri: 9 } } })
      await post(sim, '/json/state', { bri: 200 })
      sim.fail('/json/info')
      sim.reset()
      expect(sim.state.bri).toBe(9)
      expect(sim.requests).toHaveLength(0)
      expect((await get(sim, '/json/info')).res.status).toBe(200)
    })

    it('snapshot() is a detached copy', () => {
      const snap = sim.snapshot()
      sim.applyState({ bri: 1 })
      expect(snap.state.bri).toBe(128)
    })
  })
})
