import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { SegmentDefinitionsList } from './SegmentDefinitionsList'
import { CreateGroupDialog } from './CreateGroupDialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { saveSegments } from '@/lib/segmentDefinitions'
import type { WledInfo } from '@/types/wled'

interface SegmentsScreenProps {
  controllerId: string
  info: WledInfo | null
}

export function SegmentsScreen({ controllerId, info }: SegmentsScreenProps) {
  const { segments, groups, addGroup } = useSegmentDefinitions(controllerId)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)

  const ledCount = info?.leds.count ?? 0

  // Handle creating first segment (entire strip)
  const handleCreateFirstSegment = () => {
    if (ledCount > 0) {
      // Create a single segment covering the entire strip
      const firstSegment = {
        id: crypto.randomUUID(),
        controllerId,
        start: 0,
        stop: ledCount,
        name: 'Full Strip',
      }
      saveSegments([firstSegment], [])
    }
  }

  // Empty state when no segments defined
  if (segments.length === 0) {
    return (
      <>
        <ScreenContainer className="p-4">
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">No Segments Defined</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Define segment split points to organize your LED strips into named zones.
                Perfect for architectural lighting!
              </p>
            </div>
            <Button onClick={handleCreateFirstSegment} disabled={ledCount === 0}>
              <Plus className="mr-2 h-4 w-4" />
              {ledCount === 0 ? 'Loading...' : 'Create First Segment'}
            </Button>
          </div>
        </ScreenContainer>
      </>
    )
  }

  return (
    <>
      <ScreenContainer className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
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
