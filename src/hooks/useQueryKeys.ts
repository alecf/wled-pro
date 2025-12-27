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
 * queryClient.invalidateQueries({ queryKey: keys.state });
 * ```
 */
export function getQueryKeys(baseUrl: string) {
  return {
    // Core state
    fullState: ['wled', baseUrl, 'fullState'] as const,
    state: ['wled', baseUrl, 'state'] as const,
    info: ['wled', baseUrl, 'info'] as const,
    stateInfo: ['wled', baseUrl, 'stateInfo'] as const,

    // Effects and palettes
    effects: ['wled', baseUrl, 'effects'] as const,
    palettes: ['wled', baseUrl, 'palettes'] as const,
    effectData: ['wled', baseUrl, 'effectData'] as const,
    paletteData: ['wled', baseUrl, 'paletteData'] as const,
    palettesWithColors: ['wled', baseUrl, 'palettesWithColors'] as const,

    // Configuration
    config: ['wled', baseUrl, 'config'] as const,
    timers: ['wled', baseUrl, 'timers'] as const,
    ledHardwareConfig: ['wled', baseUrl, 'ledHardwareConfig'] as const,

    // Network
    nodes: ['wled', baseUrl, 'nodes'] as const,
    networks: ['wled', baseUrl, 'networks'] as const,

    // Presets
    presets: ['wled', baseUrl, 'presets'] as const,
  };
}

/** Type for the query keys object */
export type QueryKeys = ReturnType<typeof getQueryKeys>;

/** Type for individual query key values */
export type QueryKey = QueryKeys[keyof QueryKeys];
