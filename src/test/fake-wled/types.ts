/**
 * Types for the fake WLED device simulator.
 *
 * The simulator is transport-agnostic: adapters (MSW for Vitest, node:http + ws
 * for Playwright) convert their native requests into `SimRequest` and turn
 * `SimResponse` back into a real response.
 */
import type {
  PaletteDefinition,
  Segment,
  WledInfo,
  WledNetwork,
  WledPresetsFile,
  WledState,
} from '@/types/wled'

/** A segment as the simulator stores it (app type plus fields the app type omits). */
export type SimSegment = Segment & {
  o1?: boolean
  o2?: boolean
  o3?: boolean
  si?: number
  m12?: number
}

export type SimState = Omit<WledState, 'seg'> & { seg: SimSegment[] }

export type JsonObject = Record<string, unknown>

/** Everything needed to boot a fake device. Deep-cloned on every reset. */
export interface WledFixture {
  state: SimState
  info: WledInfo
  effects: string[]
  palettes: string[]
  /** One metadata string per effect, same order as `effects`. */
  fxdata: string[]
  /** Palette gradient definitions keyed by palette id (served paged via /json/palx). */
  palx: Record<string, PaletteDefinition>
  cfg: JsonObject
  presets: WledPresetsFile
  /** Extra files on the device filesystem, keyed by absolute path ("/foo.json"). */
  files: Record<string, string>
  /** `/json/nodes` response */
  nodes: { nodes: Array<{ name: string; ip: string; type: number; vid: number }> }
  net: WledNetwork
}

export type DeepPartial<T> = T extends readonly (infer _U)[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

export interface SimUploadedFile {
  field: string
  filename: string
  text: string
}

export type SimRequestBody =
  | string
  | { files: SimUploadedFile[]; fields: Record<string, string> }
  | undefined

export interface SimRequest {
  method: string
  /** Path without query string, e.g. "/json/state". */
  path: string
  query: URLSearchParams
  headers: Record<string, string>
  body?: SimRequestBody
}

export interface SimResponse {
  status: number
  headers?: Record<string, string>
  body?: string
  /** Adapter should fail the request at the network level (connection refused/reset). */
  networkError?: boolean
}

export type RequestVia = 'http' | 'ws' | 'external'

export interface RecordedRequest {
  method: string
  path: string
  query: string
  /** Parsed JSON body when the body was JSON. */
  json?: unknown
  /** Raw body (string) or multipart description. */
  body?: SimRequestBody
  via: RequestVia
  /** True when fault injection (fail/offline) answered instead of the device. */
  failed?: boolean
  ts: number
}

/** Matches recorded/incoming requests: path string (exact), RegExp on path, or predicate. */
export type RequestMatcher = string | RegExp | ((req: { method: string; path: string }) => boolean)

/** A connected WebSocket client as seen by the simulator. */
export interface SimWsClient {
  send(message: string): void
  close(): void
}

/** Handle returned to the adapter for a connected WebSocket client. */
export interface SimWsConnection {
  /** Feed a text message from the client into the simulator. */
  receive(message: string): void
  /** Tell the simulator the client went away. */
  close(): void
}
