import type {
  HardwareLedConfig,
  NetworkInstance,
  PaletteDefinition,
  WledAlexaConfig,
  WledApConfig,
  WledEffectData,
  WledFullConfig,
  WledInfo,
  WledMqttConfig,
  WledNetwork,
  WledNtpConfig,
  WledOtaConfig,
  WledPaletteData,
  WledPlaylist,
  WledPresetsFile,
  WledState,
  WledStateInfo,
  WledStateUpdate,
  WledSyncConfig,
  WledTimer,
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

  /** fetch() relative to the controller, throwing WledApiError on a non-OK response */
  private async send(path: string, init: RequestInit | undefined, what: string): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, init)
    if (!response.ok) {
      throw new WledApiError(`${what}: ${response.statusText}`, response.status)
    }
    return response
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.send(
      endpoint,
      { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } },
      'WLED API error',
    )
    const text = await response.text()
    try {
      return JSON.parse(text) as T
    } catch {
      throw new WledApiError(`Invalid JSON response from ${endpoint}`, response.status)
    }
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
    // `m` is the index of the LAST page (WLED's maxPage), not a page count;
    // out-of-range pages are clamped to it. Pages run 0..m inclusive.
    const firstPage = await this.getPaletteData(0)
    const lastPage = firstPage.m

    const allColors: Record<string, PaletteDefinition> = { ...firstPage.p }

    if (lastPage > 0) {
      const remainingPages = await Promise.all(
        Array.from({ length: lastPage }, (_, i) => this.getPaletteData(i + 1)),
      )
      for (const page of remainingPages) {
        Object.assign(allColors, page.p)
      }
    }

    return allColors
  }

  /**
   * Get available WiFi networks (for setup)
   */
  async getNetworks(): Promise<WledNetwork> {
    return this.request<WledNetwork>('/json/net')
  }

  /**
   * Get the device configuration (/json/cfg)
   */
  async getFullConfig(): Promise<WledFullConfig> {
    return this.request<WledFullConfig>('/json/cfg')
  }

  /**
   * Merge a partial configuration into /json/cfg.
   * WLED answers with {success: true}, not the new config.
   */
  private async setConfig(partial: Record<string, unknown>): Promise<void> {
    await this.request('/json/cfg', {
      method: 'POST',
      body: JSON.stringify(partial),
    })
  }

  /**
   * Update OTA/security configuration
   * @note Posts to /json/cfg for configuration changes
   */
  async setOtaConfig(ota: Partial<WledOtaConfig>): Promise<void> {
    return this.setConfig({ ota })
  }

  /**
   * Update WiFi network configuration
   * @note Requires device reboot for changes to take effect
   */
  async setNetworkConfig(nw: { ins: Partial<NetworkInstance>[] }): Promise<void> {
    return this.setConfig({ nw })
  }

  /**
   * Update Access Point configuration
   * @param ap AP configuration (password as 'psk' field)
   * @note Requires device reboot for changes to take effect
   */
  async setApConfig(ap: Partial<WledApConfig> & { psk?: string }): Promise<void> {
    return this.setConfig({ ap })
  }

  /**
   * Update sync configuration (UDP, etc.)
   */
  async setSyncConfig(sync: Partial<WledSyncConfig>): Promise<void> {
    return this.setConfig({
      if: { sync },
    })
  }

  /**
   * Update MQTT configuration
   * @param mqtt MQTT config (password as 'psk' field)
   */
  async setMqttConfig(mqtt: Partial<WledMqttConfig> & { psk?: string }): Promise<void> {
    return this.setConfig({
      if: { mqtt },
    })
  }

  /**
   * Update Alexa configuration
   */
  async setAlexaConfig(va: Partial<WledAlexaConfig>): Promise<void> {
    return this.setConfig({
      if: { va },
    })
  }

  /**
   * Factory reset the device
   * This clears all configuration and presets
   */
  async factoryReset(): Promise<void> {
    // Factory reset is done by sending a specific request
    // This will clear all settings and reboot
    await this.send(
      '/reset',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'FR=1',
      },
      'Factory reset failed',
    )
  }

  /**
   * Upload firmware update
   * @param file The firmware .bin file
   * @param onProgress Optional callback for upload progress
   */
  async uploadFirmware(file: File, onProgress?: (percent: number) => void): Promise<void> {
    const formData = new FormData()
    formData.append('update', file)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new WledApiError(`Firmware upload failed: ${xhr.statusText}`, xhr.status))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new WledApiError('Firmware upload failed: Network error'))
      })

      xhr.open('POST', `${this.baseUrl}/update`)
      xhr.send(formData)
    })
  }

  /**
   * Start a saved playlist (playlists are presets, so this loads the preset)
   */
  async startPlaylist(presetId: number): Promise<void> {
    return this.setState({ ps: presetId })
  }

  /**
   * Stop the current playlist
   */
  async stopPlaylist(): Promise<void> {
    return this.setState({ pl: -1 })
  }

  /**
   * Save a playlist as preset `id`. `o: true` makes WLED store the request
   * itself (the playlist) rather than the current state, as WLED's own UI does.
   */
  async savePlaylist(id: number, name: string, playlist: WledPlaylist): Promise<void> {
    await this.request('/json/state', {
      method: 'POST',
      body: JSON.stringify({ psave: id, n: name, on: true, o: true, playlist }),
    })
  }

  /** POST /json/state. WLED answers {success: true}, not the new state. */
  async setState(update: WledStateUpdate): Promise<void> {
    await this.request('/json/state', {
      method: 'POST',
      body: JSON.stringify(update),
    })
  }

  async setBrightness(bri: number): Promise<void> {
    return this.setState({ bri: Math.max(0, Math.min(255, bri)) })
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
  async loadPreset(id: number): Promise<void> {
    return this.setState({ ps: id })
  }

  /**
   * Save the device's state as a preset.
   *
   * Any `state` passed is applied first in the same request, so the preset
   * captures it (WLED applies the state, then saves). Brightness and segment
   * bounds are included, matching WLED's own save dialog defaults.
   *
   * @param id Preset slot (1-250)
   * @param name Preset name
   */
  async savePreset(
    id: number,
    name: string,
    options: {
      /** Quick load label (max 2 chars or 1 emoji) */
      quickLabel?: string
      /** State to apply before saving */
      state?: WledStateUpdate
    } = {},
  ): Promise<void> {
    await this.request('/json/state', {
      method: 'POST',
      body: JSON.stringify({
        ...options.state,
        psave: id,
        n: name,
        ib: true,
        sb: true,
        ...(options.quickLabel ? { ql: options.quickLabel } : {}),
      }),
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
    await this.writeJsonFile('/presets.json', {})
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
        response.status,
      )
    }

    try {
      return (await response.json()) as T
    } catch {
      throw new WledApiError(`Invalid JSON in file ${filename}`, response.status)
    }
  }

  /**
   * Write a JSON file to the WLED filesystem
   * @param filename Path to JSON file (e.g., '/wled-pro-segments.json')
   * @param data Data to write (will be JSON stringified)
   */
  async writeJsonFile(filename: string, data: unknown): Promise<void> {
    // Create form data with the JSON file
    const formData = new FormData()
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    formData.append('data', blob, filename)

    await this.send('/edit', { method: 'POST', body: formData }, `Failed to write file ${filename}`)
  }

  /**
   * Update timer/schedule configuration
   * @param timers Array of timer configurations (up to 10 slots)
   * @note Requires device reboot for changes to take effect
   */
  async setTimers(timers: (WledTimer | null)[]): Promise<void> {
    return this.setConfig({
      timers: {
        ins: timers,
      },
    })
  }

  /**
   * Reboot the WLED device
   * Use after updating configuration that requires reboot (e.g., timers)
   */
  async reboot(): Promise<void> {
    await this.send('/reset', { method: 'POST' }, 'Failed to reboot device')
  }

  /**
   * Update NTP configuration
   * @param ntp NTP configuration
   * @note Changes take effect immediately but may require reboot for schedules to work correctly
   */
  async setNtpConfig(ntp: Partial<WledNtpConfig>): Promise<void> {
    return this.setConfig({
      if: {
        ntp,
      },
    })
  }

  /**
   * Update LED hardware configuration
   * @param ledConfig Partial LED hardware configuration
   * @note Requires device reboot for changes to take effect
   */
  async setLedHardwareConfig(ledConfig: Partial<HardwareLedConfig>): Promise<void> {
    return this.setConfig({
      hw: {
        led: ledConfig,
      },
    })
  }
}

/** API client for a controller ('' = same origin, when served from WLED) */
export function getWledApi(baseUrl: string): WledApi {
  return new WledApi(baseUrl)
}
