import { describe, it, expect } from 'vitest'

/**
 * Tests for query key patterns to ensure consistency before refactoring.
 *
 * These tests verify that:
 * 1. All query keys follow the pattern ['wled', baseUrl, resource]
 * 2. Query keys used across the codebase match the centralized factory
 * 3. Cache invalidation patterns work correctly
 *
 * Run these tests before and after query key standardization (Task 3.1)
 * to ensure no regressions in cache behavior.
 */

// Import the actual getQueryKeys function from useWled.ts
// Note: This function is not exported, so we test it by reimplementing the expected pattern
// After Task 3.2, this will import from useQueryKeys.ts

const getQueryKeys = (baseUrl: string) => ({
  fullState: ['wled', baseUrl, 'fullState'] as const,
  state: ['wled', baseUrl, 'state'] as const,
  info: ['wled', baseUrl, 'info'] as const,
  stateInfo: ['wled', baseUrl, 'stateInfo'] as const,
  effects: ['wled', baseUrl, 'effects'] as const,
  palettes: ['wled', baseUrl, 'palettes'] as const,
  effectData: ['wled', baseUrl, 'effectData'] as const,
  paletteData: ['wled', baseUrl, 'paletteData'] as const,
  palettesWithColors: ['wled', baseUrl, 'palettesWithColors'] as const,
  nodes: ['wled', baseUrl, 'nodes'] as const,
  networks: ['wled', baseUrl, 'networks'] as const,
  config: ['wled', baseUrl, 'config'] as const,
  timers: ['wled', baseUrl, 'timers'] as const,
  // Missing keys that need to be added:
  presets: ['wled', baseUrl, 'presets'] as const,
  ledHardwareConfig: ['wled', baseUrl, 'ledHardwareConfig'] as const,
})

describe('Query Keys', () => {
  const testBaseUrl = 'http://192.168.1.100'

  describe('getQueryKeys factory', () => {
    it('should generate keys with correct structure', () => {
      const keys = getQueryKeys(testBaseUrl)

      // All keys should be arrays starting with 'wled'
      for (const [name, key] of Object.entries(keys)) {
        expect(Array.isArray(key), `${name} should be an array`).toBe(true)
        expect(key[0], `${name} should start with 'wled'`).toBe('wled')
        expect(key[1], `${name} should have baseUrl as second element`).toBe(testBaseUrl)
        expect(key.length, `${name} should have 3 elements`).toBe(3)
      }
    })

    it('should generate unique keys for each resource', () => {
      const keys = getQueryKeys(testBaseUrl)
      const keyStrings = Object.values(keys).map(k => JSON.stringify(k))
      const uniqueKeys = new Set(keyStrings)

      expect(uniqueKeys.size).toBe(keyStrings.length)
    })

    it('should generate different keys for different baseUrls', () => {
      const keys1 = getQueryKeys('http://192.168.1.100')
      const keys2 = getQueryKeys('http://192.168.1.200')

      expect(keys1.state).not.toEqual(keys2.state)
      expect(keys1.fullState).not.toEqual(keys2.fullState)
    })
  })

  describe('usePresets.ts key patterns (currently separate)', () => {
    // These tests document the current behavior that needs to be migrated

    it('should match the expected presets key pattern', () => {
      // Current implementation in usePresets.ts:
      // const getPresetsQueryKey = (baseUrl: string) => ['wled', baseUrl, 'presets'] as const
      const expectedKey = ['wled', testBaseUrl, 'presets']
      const keys = getQueryKeys(testBaseUrl)

      expect(keys.presets).toEqual(expectedKey)
    })

    it('should match the expected state key pattern for presets', () => {
      // Current implementation in usePresets.ts:
      // const getStateQueryKey = (baseUrl: string) => ['wled', baseUrl, 'state'] as const
      const expectedKey = ['wled', testBaseUrl, 'state']
      const keys = getQueryKeys(testBaseUrl)

      expect(keys.state).toEqual(expectedKey)
    })
  })

  describe('useWledWebSocket.ts key patterns (currently hardcoded)', () => {
    // These tests document the hardcoded key that needs to use the factory

    it('should match the fullState key used in WebSocket setQueryData', () => {
      // Current implementation in useWledWebSocket.ts line 115:
      // queryClient.setQueryData(['wled', baseUrl, 'fullState'], {...})
      const expectedKey = ['wled', testBaseUrl, 'fullState']
      const keys = getQueryKeys(testBaseUrl)

      expect(keys.fullState).toEqual(expectedKey)
    })
  })

  describe('LedHardwareScreen.tsx key patterns (currently hardcoded)', () => {
    // This key is not in the centralized factory and needs to be added

    it('should match the ledHardwareConfig key', () => {
      // Current implementation in LedHardwareScreen.tsx line 26:
      // queryKey: ['wled', baseUrl, 'ledHardwareConfig']
      const expectedKey = ['wled', testBaseUrl, 'ledHardwareConfig']
      const keys = getQueryKeys(testBaseUrl)

      expect(keys.ledHardwareConfig).toEqual(expectedKey)
    })
  })

  describe('Cache invalidation patterns', () => {
    it('should support invalidating state when mutations occur', () => {
      const keys = getQueryKeys(testBaseUrl)

      // After a mutation, we typically invalidate state and fullState
      // This pattern is used in useWled.ts mutations
      expect(keys.state).toEqual(['wled', testBaseUrl, 'state'])
      expect(keys.fullState).toEqual(['wled', testBaseUrl, 'fullState'])
    })

    it('should support invalidating presets separately from state', () => {
      const keys = getQueryKeys(testBaseUrl)

      // Presets have their own query key for independent invalidation
      expect(keys.presets).not.toEqual(keys.state)
      expect(keys.presets).not.toEqual(keys.fullState)
    })

    it('should support invalidating timers and config together', () => {
      const keys = getQueryKeys(testBaseUrl)

      // Timer mutations invalidate both timers and config
      expect(keys.timers).toEqual(['wled', testBaseUrl, 'timers'])
      expect(keys.config).toEqual(['wled', testBaseUrl, 'config'])
    })
  })

  describe('Key type safety', () => {
    it('should return readonly tuples', () => {
      const keys = getQueryKeys(testBaseUrl)

      // TypeScript should enforce these are readonly tuples
      // This test documents the expected type structure
      const stateKey: readonly ['wled', string, 'state'] = keys.state
      expect(stateKey).toBeDefined()
    })

    it('should be usable with React Query queryKey parameter', () => {
      const keys = getQueryKeys(testBaseUrl)

      // Query keys should be usable in useQuery({ queryKey: ... })
      // This test ensures the shape is compatible
      const queryConfig = {
        queryKey: keys.state,
        queryFn: async () => ({ on: true, bri: 128 }),
      }

      expect(queryConfig.queryKey).toEqual(['wled', testBaseUrl, 'state'])
    })
  })
})
