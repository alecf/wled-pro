import type {
  WledFullState,
  WledState,
  WledInfo,
  WledStateUpdate,
  WledStateInfo,
  WledEffectData,
  WledPaletteData,
  PaletteDefinition,
  WledNodes,
  WledNetwork,
  WledConfig,
  WledPresetsFile,
  WledTimer,
  WledTimersConfig,
  WledNtpConfig,
  HardwareLedConfig,
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

    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new WledApiError(
        `Invalid JSON response from ${endpoint}`,
        response.status
      )
    }
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
   * Get extended palette data with color definitions for a specific page
   */
  async getPaletteData(page?: number): Promise<WledPaletteData> {
    const endpoint = page !== undefined ? `/json/palx?page=${page}` : '/json/palx'
    return this.request<WledPaletteData>(endpoint)
  }

  /**
   * Get all palette colors from all pages
   * @returns Record mapping palette ID to palette definition
   */
  async getAllPaletteColors(): Promise<Record<string, PaletteDefinition>> {
    // Get first page to find out how many pages there are
    const firstPage = await this.getPaletteData(0)
    const pageCount = firstPage.m

    // Combine first page with remaining pages
    const allColors: Record<string, PaletteDefinition> = { ...firstPage.p }

    // Fetch remaining pages in parallel
    if (pageCount > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, i) => this.getPaletteData(i + 1))
      )

      // Merge all pages
      for (const page of remainingPages) {
        Object.assign(allColors, page.p)
      }
    }

    return allColors
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

  /**
   * Get all presets from the device
   */
  async getPresets(): Promise<WledPresetsFile> {
    return this.request<WledPresetsFile>('/presets.json')
  }

  /**
   * Load a preset by ID
   */
  async loadPreset(id: number): Promise<WledState> {
    return this.setState({ ps: id })
  }

  /**
   * Save current state as a preset
   * @param id Preset slot (1-250)
   * @param name Preset name
   * @param options Additional save options
   */
  async savePreset(
    id: number,
    name: string,
    options?: {
      /** Include current brightness in preset */
      includeBrightness?: boolean
      /** Save segment bounds (required for boot presets) */
      saveSegmentBounds?: boolean
      /** Quick load label (max 2 chars or 1 emoji) */
      quickLabel?: string
    }
  ): Promise<WledState> {
    const update: Record<string, unknown> = {
      psave: id,
      n: name,
    }

    if (options?.quickLabel) {
      update.ql = options.quickLabel
    }

    // Note: includeBrightness and saveSegmentBounds are handled by WLED
    // based on what's in the current state when saving
    return this.request<WledState>('/json/state', {
      method: 'POST',
      body: JSON.stringify(update),
    })
  }

  /**
   * Delete a preset by setting it to empty
   * @param id Preset slot to delete
   */
  async deletePreset(id: number): Promise<void> {
    // WLED deletes a preset by saving an empty object to that slot
    await this.request('/json/state', {
      method: 'POST',
      body: JSON.stringify({ pdel: id }),
    })
  }

  /**
   * Reset all presets by uploading an empty presets file
   * This is useful when presets.json becomes corrupted
   */
  async resetAllPresets(): Promise<void> {
    const url = `${this.baseUrl}/edit`
    const emptyPresets = '{}'

    // Create form data with the empty presets file
    const formData = new FormData()
    const blob = new Blob([emptyPresets], { type: 'application/json' })
    formData.append('data', blob, '/presets.json')

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new WledApiError(
        `Failed to reset presets: ${response.statusText}`,
        response.status
      )
    }
  }

  /**
   * Read a JSON file from the WLED filesystem
   * @param filename Path to JSON file (e.g., '/wled-pro-segments.json')
   * @returns Parsed JSON data, or null if file doesn't exist (404)
   */
  async readJsonFile<T = unknown>(filename: string): Promise<T | null> {
    const url = `${this.baseUrl}${filename}`
    const response = await fetch(url)

    if (response.status === 404) {
      return null // File doesn't exist
    }

    if (!response.ok) {
      throw new WledApiError(
        `Failed to read file ${filename}: ${response.statusText}`,
        response.status
      )
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new WledApiError(
        `Invalid JSON in file ${filename}`,
        response.status
      )
    }
  }

  /**
   * Write a JSON file to the WLED filesystem
   * @param filename Path to JSON file (e.g., '/wled-pro-segments.json')
   * @param data Data to write (will be JSON stringified)
   */
  async writeJsonFile(filename: string, data: unknown): Promise<void> {
    const url = `${this.baseUrl}/edit`

    // Create form data with the JSON file
    const formData = new FormData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    formData.append('data', blob, filename)

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new WledApiError(
        `Failed to write file ${filename}: ${response.statusText}`,
        response.status
      )
    }
  }

  /**
   * Get timer/schedule configuration
   * @returns Timers configuration object
   */
  async getTimers(): Promise<WledTimersConfig> {
    const config = await this.getConfig()
    return config.timers as WledTimersConfig
  }

  /**
   * Update timer/schedule configuration
   * @param timers Array of timer configurations (up to 10 slots)
   * @returns Updated configuration
   * @note Requires device reboot for changes to take effect
   */
  async setTimers(timers: (WledTimer | null)[]): Promise<WledConfig> {
    return this.request<WledConfig>('/json', {
      method: 'POST',
      body: JSON.stringify({
        timers: {
          ins: timers,
        },
      }),
    })
  }

  /**
   * Reboot the WLED device
   * Use after updating configuration that requires reboot (e.g., timers)
   */
  async reboot(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/reset`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new WledApiError(
        `Failed to reboot device: ${response.statusText}`,
        response.status
      )
    }
  }

  /**
   * Get NTP time synchronization configuration
   * @returns NTP configuration
   */
  async getNtpConfig(): Promise<WledNtpConfig> {
    const config = await this.getConfig()
    return ((config as Record<string, unknown>).if as Record<string, unknown>)
      .ntp as WledNtpConfig
  }

  /**
   * Update NTP configuration
   * @param ntp NTP configuration
   * @returns Updated configuration
   * @note Changes take effect immediately but may require reboot for schedules to work correctly
   */
  async setNtpConfig(ntp: Partial<WledNtpConfig>): Promise<WledConfig> {
    return this.request<WledConfig>('/json', {
      method: 'POST',
      body: JSON.stringify({
        if: {
          ntp,
        },
      }),
    })
  }

  /**
   * Get LED hardware configuration
   * @returns LED hardware configuration
   */
  async getLedHardwareConfig(): Promise<HardwareLedConfig> {
    const config = await this.getConfig()
    return config.hw.led
  }

  /**
   * Update LED hardware configuration
   * @param ledConfig Partial LED hardware configuration
   * @returns Updated configuration
   * @note Requires device reboot for changes to take effect
   */
  async setLedHardwareConfig(ledConfig: Partial<HardwareLedConfig>): Promise<WledConfig> {
    return this.request<WledConfig>('/json', {
      method: 'POST',
      body: JSON.stringify({
        hw: {
          led: ledConfig,
        },
      }),
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
