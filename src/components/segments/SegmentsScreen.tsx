import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { SimpleInputDialog } from '@/components/common/SimpleInputDialog'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { Button } from '@/components/ui/button'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import type { WledInfo } from '@/types/wled'
import { SegmentDefinitionsList } from './SegmentDefinitionsList'

interface SegmentsScreenProps {
  controllerId: string
  info: WledInfo | null
}

export function SegmentsScreen({ controllerId, info }: SegmentsScreenProps) {
  const { segments, groups, addGroup, initializeSegments, isLoading, loadError, reloadFromFile } =
    useSegmentDefinitions(controllerId)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)

  const ledCount = info?.leds.count ?? 0

  // Handle creating first segment (entire strip)
  const handleCreateFirstSegment = () => {
    if (ledCount > 0) {
      // Create a single segment covering the entire strip
      const firstSegment = {
        id: crypto.randomUUID(),
        start: 0,
        stop: ledCount,
        name: 'Full Strip',
      }
      initializeSegments([firstSegment])
    }
  }

  // Until the file is read, an empty list doesn't mean there is no saved layout
  if (isLoading) {
    return <LoadingScreen message="Loading segments..." />
  }

  if (loadError) {
    return (
      <ScreenContainer className="p-4">
        <ErrorState title="Failed to load segments" message={loadError} onRetry={reloadFromFile} />
      </ScreenContainer>
    )
  }

  // Empty state when no segments defined
  if (segments.length === 0) {
    return (
      <ScreenContainer className="p-4">
        <EmptyState
          icon={Plus}
          title="No Segments Defined"
          description="Define segment split points to organize your LED strips into named zones. Perfect for architectural lighting!"
          action={{
            label: ledCount === 0 ? 'Loading...' : 'Create First Segment',
            onClick: handleCreateFirstSegment,
          }}
        />
      </ScreenContainer>
    )
  }

  return (
    <>
      <ScreenContainer className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Segment Definitions</h2>
            <p className="text-sm text-muted-foreground">
              {ledCount > 0 ? `${ledCount} LEDs total` : 'Loading...'}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreateGroupDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </Button>
        </div>

        <SegmentDefinitionsList
          segments={segments}
          groups={groups}
          ledCount={ledCount}
          controllerId={controllerId}
        />
      </ScreenContainer>

      <SimpleInputDialog
        open={showCreateGroupDialog}
        onOpenChange={setShowCreateGroupDialog}
        title="Create Group"
        fieldLabel="Group Name"
        placeholder="Enter group name"
        onSubmit={addGroup}
        submitLabel="Create"
      />
    </>
  )
}
