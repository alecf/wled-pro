/**
 * Centralized query key factory for all WLED-related queries.
 *
 * All query keys follow the pattern: ['wled', baseUrl, resource]
 *
 * This ensures consistent cache invalidation across the app and makes
 * it easy to find all queries related to a specific resource.
 *
 * @example
 * ```tsx
 * import { getQueryKeys } from './useQueryKeys';
 *
 * const keys = getQueryKeys(baseUrl);
 * queryClient.invalidateQueries({ queryKey: keys.presets });
 * ```
 */
export function getQueryKeys(baseUrl: string) {
  return {
    // Core state
    stateInfo: ['wled', baseUrl, 'stateInfo'] as const,

    // Effects and palettes
    effects: ['wled', baseUrl, 'effects'] as const,
    palettes: ['wled', baseUrl, 'palettes'] as const,
    effectData: ['wled', baseUrl, 'effectData'] as const,
    palettesWithColors: ['wled', baseUrl, 'palettesWithColors'] as const,

    // Configuration
    config: ['wled', baseUrl, 'config'] as const,

    // Network
    networks: ['wled', baseUrl, 'networks'] as const,

    // Presets
    presets: ['wled', baseUrl, 'presets'] as const,

    // Global segments (/wled-pro-segments.json)
    segmentsFile: ['wled', baseUrl, 'segmentsFile'] as const,
  }
}
