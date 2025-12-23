/**
 * Global Segment Definitions Types
 * For defining reusable LED zone templates per controller
 */

export interface GlobalSegment {
  id: string // UUID
  controllerId: string // Links to Controller.id
  start: number // LED index (inclusive)
  stop: number // LED index (exclusive)
  name: string // User-provided name
  groupId?: string // Optional group membership
}

export interface SegmentGroup {
  id: string
  controllerId: string
  name: string
}

export interface SegmentStore {
  segments: GlobalSegment[]
  groups: SegmentGroup[]
}

/**
 * Consistent label type for auto-labeling
 * Always returns an object (never raw string)
 */
export interface SegmentLabel {
  display: string // What to show in UI
  tooltip?: string // Optional full text if truncated
}

/**
 * Validation result for operations
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}
