/**
 * Conversion between the Fetch API (`Request`/`Response`) and the simulator's
 * transport-agnostic request/response types. Shared by the MSW adapter and the
 * Node HTTP server adapter (which builds a `Request` from node:http).
 */
import type { FakeWled } from '../FakeWled'
import type { SimRequest, SimResponse, SimUploadedFile } from '../types'

async function toSimRequest(request: Request): Promise<SimRequest> {
  const url = new URL(request.url)
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  const sim: SimRequest = {
    method: request.method.toUpperCase(),
    path: url.pathname,
    query: url.searchParams,
    headers,
  }
  if (request.method === 'GET' || request.method === 'HEAD') return sim

  const contentType = headers['content-type'] ?? ''
  if (contentType.startsWith('multipart/form-data')) {
    const form = await request.formData()
    const files: SimUploadedFile[] = []
    const fields: Record<string, string> = {}
    for (const [field, value] of form.entries()) {
      if (typeof value === 'string') fields[field] = value
      else files.push({ field, filename: value.name, text: await value.text() })
    }
    sim.body = { files, fields }
  } else {
    const text = await request.text()
    sim.body = text.length > 0 ? text : undefined
  }
  return sim
}

/** Run a Fetch `Request` through the simulator (check `networkError` on the result). */
export async function handleFetch(sim: FakeWled, request: Request): Promise<SimResponse> {
  return sim.handle(await toSimRequest(request))
}
