import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { SegmentDefinitionsList } from './SegmentDefinitionsList'
import { CreateGroupDialog } from './CreateGroupDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { WledInfo } from '@/types/wled'

interface SegmentsScreenProps {
  controllerId: string
  info: WledInfo | null
}

export function SegmentsScreen({ controllerId, info }: SegmentsScreenProps) {
  const { segments, groups, addGroup, initializeSegments } =
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

  // Empty state when no segments defined
  if (segments.length === 0) {
    return (
      <>
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
      </>
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

      {/* Create group dialog */}
      <CreateGroupDialog
        open={showCreateGroupDialog}
        onCreateGroup={(name) => {
          addGroup(name)
          setShowCreateGroupDialog(false)
        }}
        onClose={() => setShowCreateGroupDialog(false)}
      />
    </>
  )
}
