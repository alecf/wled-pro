/**
 * Global Segment Definitions Types
 * For defining reusable LED zone templates per controller
 */

export interface GlobalSegment {
  id: string // UUID
  start: number // LED index (inclusive)
  stop: number // LED index (exclusive)
  name: string // User-provided name
  groupId?: string // Optional group membership
}

export interface SegmentGroup {
  id: string
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

/**
 * File-based segment store format
 * Stored in /wled-pro-segments.json on each controller
 */
export interface FileSegmentStore {
  version: 1
  lastModified: number // Unix timestamp
  segments: GlobalSegment[]
  groups: SegmentGroup[]
}

/**
 * Sync status for UI feedback
 */
export interface SyncStatus {
  synced: boolean
  pending: boolean
  error?: string
  lastSyncTime?: number
}
