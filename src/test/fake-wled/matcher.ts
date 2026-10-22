import type { RequestMatcher } from './types'

export function matches(matcher: RequestMatcher, req: { method: string; path: string }): boolean {
  if (typeof matcher === 'string') return req.path === matcher
  if (matcher instanceof RegExp) {
    matcher.lastIndex = 0 // /g and /y regexps are stateful across test() calls
    return matcher.test(req.path)
  }
  return matcher(req)
}

/** Paths that accept a JSON state update via POST. */
export function isStatePath(path: string): boolean {
  return path === '/json/state' || path === '/json' || path === '/json/si'
}
