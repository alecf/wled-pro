/**
 * A stateful, transport-agnostic fake WLED device.
 *
 * Adapters call `handle()` for HTTP and `connect()` for WebSocket clients.
 * Tests read `sim.state` / `sim.presets` / `sim.files` directly, push external
 * changes with `applyState()`, and inject faults with `fail()` / `latency()` /
 * `goOffline()`.
 */
import type { WledInfo, WledPresetsFile } from '@/types/wled'
import { type FailOptions, Faults } from './faults'
import { minimalFixture } from './fixtures/minimal'
import { isStatePath, matches } from './matcher'
import { route } from './router'
import { applyConfigUpdate } from './semantics/config'
import { applyStateUpdate, type DeviceModel } from './semantics/state'
import { clone, deepMergeInto } from './semantics/values'
import type {
  DeepPartial,
  JsonObject,
  RecordedRequest,
  RequestMatcher,
  RequestVia,
  SimRequest,
  SimResponse,
  SimState,
  SimWsClient,
  SimWsConnection,
  WledFixture,
} from './types'

export interface FakeWledOptions {
  /** Device to boot (default: the hand-built minimal fixture). */
  fixture?: WledFixture
  /** Deep-partial overrides applied on top of the fixture (arrays replace). */
  overrides?: DeepPartial<Pick<WledFixture, 'state' | 'info' | 'cfg' | 'presets' | 'files'>>
  /**
   * What POST /json/state answers with. Real WLED answers `{"success":true}`
   * unless the body contains `v: true` (then the full state). Default 'success'.
   */
  postResponse?: 'success' | 'state'
  /** How long the device is unreachable after /reset or /update (default 0). */
  rebootDowntimeMs?: number
  /** Max concurrent WebSocket clients; the oldest is dropped (default 4, like ESP32). */
  maxWsClients?: number
  now?: () => number
  random?: () => number
}

type Events = {
  broadcast: (message: string) => void
  request: (req: RecordedRequest) => void
  stateChange: (state: SimState) => void
}

export interface WaitOptions {
  timeout?: number
}

export class FakeWled {
  readonly options: Required<Omit<FakeWledOptions, 'overrides'>> &
    Pick<FakeWledOptions, 'overrides'>

  state!: SimState
  info!: WledInfo
  cfg!: JsonObject
  presets!: WledPresetsFile
  files!: Map<string, string>
  effects!: string[]
  palettes!: string[]
  fxdata!: string[]
  palx!: WledFixture['palx']
  nodes!: WledFixture['nodes']
  net!: WledFixture['net']

  /** Every request seen (HTTP, WS messages and external `applyState` calls). */
  readonly requests: RecordedRequest[] = []

  private readonly faults: Faults
  private clients: SimWsClient[] = []
  private listeners: { [K in keyof Events]: Set<Events[K]> } = {
    broadcast: new Set(),
    request: new Set(),
    stateChange: new Set(),
  }

  constructor(options: FakeWledOptions = {}) {
    this.options = {
      fixture: options.fixture ?? minimalFixture(),
      overrides: options.overrides,
      postResponse: options.postResponse ?? 'success',
      rebootDowntimeMs: options.rebootDowntimeMs ?? 0,
      maxWsClients: options.maxWsClients ?? 4,
      now: options.now ?? (() => Date.now()),
      random: options.random ?? Math.random,
    }
    this.faults = new Faults(() => this.options.now())
    this.load()
  }

  // ---------------------------------------------------------------------------
  // Lifecycle

  /** Restore fixture state, clear recorded requests, faults, listeners and WS clients. */
  reset(): void {
    this.dropWsClients()
    this.requests.length = 0
    this.faults.clear()
    for (const set of Object.values(this.listeners)) set.clear()
    this.load()
  }

  /** Deep copy of the device's mutable data, handy for assertions and debugging. */
  snapshot() {
    return clone({
      state: this.state,
      info: this.info,
      cfg: this.cfg,
      presets: this.presets,
      files: Object.fromEntries(this.files),
    })
  }

  /** Simulate a reboot: drop WS clients and go offline for `rebootDowntimeMs`. */
  reboot(): void {
    this.dropWsClients()
    if (this.options.rebootDowntimeMs > 0) this.faults.goOffline(this.options.rebootDowntimeMs)
    this.info.uptime = 0
  }

  private load(factoryDefaults = false) {
    const fx = clone(this.options.fixture)
    if (this.options.overrides && !factoryDefaults) {
      deepMergeInto(fx as unknown as JsonObject, clone(this.options.overrides) as JsonObject)
    }
    this.state = fx.state
    this.info = fx.info
    this.cfg = fx.cfg
    this.presets = fx.presets
    this.files = new Map(Object.entries(fx.files))
    this.effects = fx.effects
    this.palettes = fx.palettes
    this.fxdata = fx.fxdata
    this.palx = fx.palx
    this.nodes = fx.nodes
    this.net = fx.net
    this.info.fxcount = this.effects.length
    this.info.palcount = this.palettes.length
    this.syncDerivedInfo()
  }

  /** Factory reset (POST /reset with FR=1): fixture defaults without overrides. */
  factoryReset(): void {
    this.load(true)
  }

  // ---------------------------------------------------------------------------
  // State

  /**
   * Apply a state update as if it came from somewhere other than the app under
   * test (another phone, a button, a schedule). Broadcasts to WS clients.
   */
  applyState(update: JsonObject, opts: { source?: RequestVia } = {}): void {
    this.record({
      method: 'POST',
      path: '/json/state',
      query: '',
      json: update,
      via: opts.source ?? 'external',
    })
    this.applyStateInternal(update)
  }

  /** @internal used by the router and WS handling. */
  applyStateInternal(update: JsonObject): void {
    applyStateUpdate(this.model(), update)
    this.syncDerivedInfo()
    this.emit('stateChange', this.state)
    this.broadcast()
  }

  /** @internal */
  applyConfig(patch: JsonObject): void {
    applyConfigUpdate(this.cfg, this.info, patch)
  }

  /** Every decoded state mutation sent via HTTP or WS (excludes pure `{v:true}`). */
  stateUpdates(): JsonObject[] {
    return this.requests
      .filter(
        (r) =>
          (r.via === 'ws' || (r.method === 'POST' && isStatePath(r.path))) && isMutation(r.json),
      )
      .map((r) => r.json as JsonObject)
  }

  private model(): DeviceModel {
    return {
      state: this.state,
      presets: this.presets,
      ledCount: this.info.leds.count,
      maxSeg: this.info.leds.maxseg,
      fxCount: this.effects.length,
      palCount: this.palettes.length,
      random: this.options.random,
    }
  }

  private syncDerivedInfo() {
    const leds = this.info.leds as WledInfo['leds'] & { seglc?: number[] }
    if (Array.isArray(leds.seglc)) leds.seglc = this.state.seg.map((_, i) => leds.seglc?.[i] ?? 1)
  }

  // ---------------------------------------------------------------------------
  // HTTP

  /** Handle one HTTP request. Used by every adapter. */
  async handle(req: SimRequest): Promise<SimResponse> {
    if (req.method === 'OPTIONS') {
      return { status: 204, headers: corsHeaders() }
    }
    this.record({
      method: req.method,
      path: req.path,
      query: req.query.toString(),
      json: typeof req.body === 'string' ? tryParse(req.body) : undefined,
      body: req.body,
      via: 'http',
    })
    const delay = this.faults.delayFor(req)
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    const failure = this.faults.takeFailure(req)
    const res = failure ?? route(this, req)
    return { ...res, headers: { ...corsHeaders(), ...res.headers } }
  }

  // ---------------------------------------------------------------------------
  // WebSocket

  /** Register a WebSocket client. Sends the initial `{state, info}` immediately. */
  connect(client: SimWsClient): SimWsConnection {
    if (this.faults.isOffline()) {
      client.close()
      return { receive: () => {}, close: () => {} }
    }
    while (this.clients.length >= this.options.maxWsClients) {
      this.clients.shift()?.close()
    }
    this.clients.push(client)
    client.send(this.fullMessage())
    return {
      receive: (message) => this.receiveWs(client, message),
      close: () => {
        this.clients = this.clients.filter((c) => c !== client)
      },
    }
  }

  /** Number of currently connected WebSocket clients. */
  get wsClientCount(): number {
    return this.clients.length
  }

  /** Close every WebSocket connection (clients will typically reconnect). */
  dropWsClients(): void {
    const clients = this.clients
    this.clients = []
    for (const c of clients) c.close()
  }

  private receiveWs(client: SimWsClient, message: string) {
    const json = tryParse(message)
    this.record({ method: 'WS', path: '/ws', query: '', json, via: 'ws' })
    if (!json || typeof json !== 'object' || Array.isArray(json)) return // WLED ignores bad JSON
    const body = json as JsonObject
    if (!isMutation(body)) {
      if (body.v) client.send(this.fullMessage())
      return
    }
    this.applyStateInternal(body)
  }

  private fullMessage(): string {
    return JSON.stringify({ state: this.state, info: this.info })
  }

  private broadcast() {
    const message = this.fullMessage()
    for (const c of this.clients) c.send(message)
    this.emit('broadcast', message)
  }

  // ---------------------------------------------------------------------------
  // Faults

  fail(match: RequestMatcher, options?: FailOptions): void {
    this.faults.fail(match, options)
  }

  latency(rule: number | { match?: RequestMatcher; ms: number }): void {
    this.faults.latency(rule)
  }

  /** Refuse HTTP and WS for `ms` (or until `goOnline()`), dropping current WS clients. */
  goOffline(ms?: number): void {
    this.faults.goOffline(ms)
    this.dropWsClients()
  }

  goOnline(): void {
    this.faults.goOnline()
  }

  get isOffline(): boolean {
    return this.faults.isOffline()
  }

  // ---------------------------------------------------------------------------
  // Events & waiting

  on<K extends keyof Events>(event: K, fn: Events[K]): () => void {
    this.listeners[event].add(fn)
    return () => this.listeners[event].delete(fn)
  }

  private emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>) {
    for (const fn of this.listeners[event]) (fn as (...a: Parameters<Events[K]>) => void)(...args)
  }

  private record(r: Omit<RecordedRequest, 'ts'>) {
    const rec: RecordedRequest = { ...r, ts: this.options.now() }
    this.requests.push(rec)
    this.emit('request', rec)
  }

  /** Resolve with the first recorded (past or future) request matching `matcher`. */
  waitForRequest(matcher: RequestMatcher, opts: WaitOptions = {}): Promise<RecordedRequest> {
    const found = this.requests.find((r) => matches(matcher, r))
    if (found) return Promise.resolve(found)
    return this.waitFor('request', (r) => matches(matcher, r), opts, `request ${String(matcher)}`)
  }

  /** Resolve once `predicate(state)` holds (checked now and after every state change). */
  waitForState(predicate: (s: SimState) => boolean, opts: WaitOptions = {}): Promise<SimState> {
    if (predicate(this.state)) return Promise.resolve(this.state)
    return this.waitFor('stateChange', predicate, opts, 'state predicate')
  }

  private waitFor<K extends 'request' | 'stateChange'>(
    event: K,
    predicate: (arg: Parameters<Events[K]>[0]) => boolean,
    { timeout = 2000 }: WaitOptions,
    label: string,
  ): Promise<Parameters<Events[K]>[0]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        off()
        reject(new Error(`FakeWled: timed out after ${timeout}ms waiting for ${label}`))
      }, timeout)
      const off = this.on(event, ((arg: Parameters<Events[K]>[0]) => {
        if (!predicate(arg)) return
        clearTimeout(timer)
        off()
        resolve(arg)
      }) as Events[K])
    })
  }
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  }
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** True if a state body does more than request data (`v`) or a live stream (`lv`). */
function isMutation(json: unknown): boolean {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false
  return Object.keys(json).some((k) => k !== 'v' && k !== 'lv')
}
