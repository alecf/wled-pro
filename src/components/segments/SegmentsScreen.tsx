import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import { SegmentDefinitionsList } from './SegmentDefinitionsList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { WledInfo } from '@/types/wled'

interface SegmentsScreenProps {
  controllerId: string
  info: WledInfo | null
}

export function SegmentsScreen({ controllerId, info }: SegmentsScreenProps) {
  const { segments, groups } = useSegmentDefinitions(controllerId)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)

  const ledCount = info?.leds.count ?? 0

  // Empty state when no segments defined
  if (segments.length === 0) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">No Segments Defined</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Define segment split points to organize your LED strips into named zones.
              Perfect for architectural lighting!
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create First Segment
          </Button>
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Segment Definitions</h2>
          <p className="text-sm text-muted-foreground">
            {ledCount > 0 ? `${ledCount} LEDs total` : 'Loading...'}
          </p>
        </div>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Group
        </Button>
      </div>

      <SegmentDefinitionsList
        segments={segments}
        groups={groups}
        ledCount={ledCount}
        selectedSegmentId={selectedSegmentId}
        onSelectSegment={setSelectedSegmentId}
      />
    </ScreenContainer>
  )
}
