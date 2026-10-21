/**
 * Fault injection: forced failures, artificial latency and offline windows.
 */
import { matches } from './matcher'
import type { RequestMatcher, SimResponse } from './types'

export interface FailOptions {
  /** HTTP status to answer with (default 500). Ignored when `networkError` is set. */
  status?: number
  /** Fail at the network level instead of answering. */
  networkError?: boolean
  /** Only fail this many matching requests (default: until cleared). */
  times?: number
}

interface FailRule extends FailOptions {
  match: RequestMatcher
}

interface LatencyRule {
  match?: RequestMatcher
  ms: number
}

export class Faults {
  private failRules: FailRule[] = []
  private latencyRules: LatencyRule[] = []
  private offlineUntil = 0
  private offlineForever = false
  private now: () => number

  constructor(now: () => number) {
    this.now = now
  }

  fail(match: RequestMatcher, options: FailOptions = {}) {
    if (options.times !== undefined && options.times <= 0) return
    this.failRules.push({ match, ...options })
  }

  latency(rule: number | LatencyRule) {
    this.latencyRules.push(typeof rule === 'number' ? { ms: rule } : rule)
  }

  /** Go offline for `ms` (or until `goOnline()` when omitted). */
  goOffline(ms?: number) {
    if (ms === undefined) this.offlineForever = true
    else this.offlineUntil = Math.max(this.offlineUntil, this.now() + ms)
  }

  goOnline() {
    this.offlineForever = false
    this.offlineUntil = 0
  }

  isOffline(): boolean {
    return this.offlineForever || this.now() < this.offlineUntil
  }

  clear() {
    this.failRules = []
    this.latencyRules = []
    this.goOnline()
  }

  /** Total artificial delay for this request. */
  delayFor(req: { method: string; path: string }): number {
    return this.latencyRules
      .filter((r) => !r.match || matches(r.match, req))
      .reduce((sum, r) => sum + r.ms, 0)
  }

  /** A forced failure response for this request, consuming one use of the rule. */
  takeFailure(req: { method: string; path: string }): SimResponse | null {
    if (this.isOffline()) return { status: 0, networkError: true }
    const rule = this.failRules.find((r) => matches(r.match, req))
    if (!rule) return null
    if (rule.times !== undefined) {
      rule.times--
      if (rule.times <= 0) this.failRules = this.failRules.filter((r) => r !== rule)
    }
    if (rule.networkError) return { status: 0, networkError: true }
    const status = rule.status ?? 500
    return { status, body: JSON.stringify({ error: status }) }
  }
}
