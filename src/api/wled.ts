import type {
  WledFullState,
  WledState,
  WledInfo,
  WledStateUpdate,
  WledStateInfo,
  WledEffectData,
  WledPaletteData,
  WledNodes,
  WledNetwork,
  WledConfig,
} from '../types/wled'

export class WledApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'WledApiError'
    this.status = status
  }
}

export class WledApi {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new WledApiError(
        `WLED API error: ${response.statusText}`,
        response.status
      )
    }

    return response.json()
  }

  async getFullState(): Promise<WledFullState> {
    return this.request<WledFullState>('/json')
  }

  async getState(): Promise<WledState> {
    return this.request<WledState>('/json/state')
  }

  async getInfo(): Promise<WledInfo> {
    return this.request<WledInfo>('/json/info')
  }

  async getEffects(): Promise<string[]> {
    return this.request<string[]>('/json/eff')
  }

  async getPalettes(): Promise<string[]> {
    return this.request<string[]>('/json/pal')
  }

  /**
   * Get combined state and info (more efficient than separate calls)
   */
  async getStateInfo(): Promise<WledStateInfo> {
    return this.request<WledStateInfo>('/json/si')
  }

  /**
   * Get effect metadata (parameter labels, flags, defaults)
   */
  async getEffectData(): Promise<WledEffectData> {
    return this.request<WledEffectData>('/json/fxdata')
  }

  /**
   * Get extended palette data with color definitions
   */
  async getPaletteData(): Promise<WledPaletteData> {
    return this.request<WledPaletteData>('/json/palx')
  }

  /**
   * Get discovered WLED nodes on the network
   */
  async getNodes(): Promise<WledNodes> {
    return this.request<WledNodes>('/json/nodes')
  }

  /**
   * Get available WiFi networks (for setup)
   */
  async getNetworks(): Promise<WledNetwork> {
    return this.request<WledNetwork>('/json/net')
  }

  /**
   * Get full device configuration
   */
  async getConfig(): Promise<WledConfig> {
    return this.request<WledConfig>('/json/cfg')
  }

  async setState(update: WledStateUpdate): Promise<WledState> {
    return this.request<WledState>('/json/state', {
      method: 'POST',
      body: JSON.stringify(update),
    })
  }

  async toggle(): Promise<WledState> {
    return this.request<WledState>('/json/state', {
      method: 'POST',
      body: JSON.stringify({ on: 't' }),
    })
  }

  async setBrightness(bri: number): Promise<WledState> {
    return this.setState({ bri: Math.max(0, Math.min(255, bri)) })
  }

  async setEffect(segmentId: number, effectId: number): Promise<WledState> {
    return this.setState({
      seg: [{ id: segmentId, fx: effectId }],
    })
  }

  async setPalette(segmentId: number, paletteId: number): Promise<WledState> {
    return this.setState({
      seg: [{ id: segmentId, pal: paletteId }],
    })
  }

  async setColor(
    segmentId: number,
    color: [number, number, number]
  ): Promise<WledState> {
    return this.setState({
      seg: [{ id: segmentId, col: [color] }],
    })
  }
}

let defaultApi: WledApi | null = null

export function getWledApi(baseUrl?: string): WledApi {
  if (baseUrl) {
    return new WledApi(baseUrl)
  }
  if (!defaultApi) {
    // Default to same origin (for when UI is served from WLED)
    defaultApi = new WledApi('')
  }
  return defaultApi
}

export function setDefaultWledApi(baseUrl: string): void {
  defaultApi = new WledApi(baseUrl)
}
