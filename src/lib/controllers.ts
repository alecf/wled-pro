import type { Controller } from '@/types/controller'

const STORAGE_KEY = 'wled-pro-controllers'

export function getControllers(): Controller[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function saveControllers(controllers: Controller[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(controllers))
}

export function addController(url: string, name?: string): Controller {
  const controllers = getControllers()
  const controller: Controller = {
    id: crypto.randomUUID(),
    name: name || new URL(url).hostname,
    url: normalizeUrl(url),
    addedAt: Date.now(),
  }
  controllers.push(controller)
  saveControllers(controllers)
  return controller
}

export function removeController(id: string): void {
  const controllers = getControllers().filter((c) => c.id !== id)
  saveControllers(controllers)
}

export function updateController(
  id: string,
  updates: Partial<Pick<Controller, 'name' | 'url'>>
): void {
  const controllers = getControllers().map((c) =>
    c.id === id ? { ...c, ...updates } : c
  )
  saveControllers(controllers)
}

function normalizeUrl(url: string): string {
  let normalized = url.trim()

  // Add protocol if missing
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `http://${normalized}`
  }

  // Validate URL format and protocol
  try {
    const parsed = new URL(normalized)

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only HTTP and HTTPS protocols are allowed')
    }

    // Ensure there's a hostname
    if (!parsed.hostname) {
      throw new Error('URL must have a valid hostname')
    }

    // Remove trailing slash and return
    return normalized.replace(/\/$/, '')
  } catch (err) {
    if (err instanceof Error && err.message.includes('protocols are allowed')) {
      throw err
    }
    throw new Error('Invalid URL format. Please enter a valid IP address or hostname.')
  }
}
