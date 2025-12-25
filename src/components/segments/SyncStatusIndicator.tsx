import { CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import type { SyncStatus } from '@/types/segments'

interface SyncStatusIndicatorProps {
  status: SyncStatus
}

export function SyncStatusIndicator({ status }: SyncStatusIndicatorProps) {
  if (status.synced) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span>Synced to controller</span>
      </div>
    )
  }

  if (status.pending) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Syncing...</span>
      </div>
    )
  }

  if (status.error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" />
        <span>Sync failed</span>
      </div>
    )
  }

  return null
}
