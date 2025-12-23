import { useMemo } from 'react'
import { SegmentGroupSection } from './SegmentGroupSection'
import { SegmentDefinitionCard } from './SegmentDefinitionCard'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'

interface SegmentDefinitionsListProps {
  segments: GlobalSegment[]
  groups: SegmentGroup[]
  ledCount: number
  selectedSegmentId: string | null
  onSelectSegment: (id: string | null) => void
}

export function SegmentDefinitionsList({
  segments,
  groups,
  ledCount,
  selectedSegmentId,
  onSelectSegment,
}: SegmentDefinitionsListProps) {
  // Group segments by groupId
  const { groupedSegments, ungroupedSegments } = useMemo(() => {
    const grouped: Record<string, GlobalSegment[]> = {}
    const ungrouped: GlobalSegment[] = []

    segments.forEach((segment) => {
      if (segment.groupId) {
        if (!grouped[segment.groupId]) {
          grouped[segment.groupId] = []
        }
        grouped[segment.groupId].push(segment)
      } else {
        ungrouped.push(segment)
      }
    })

    return { groupedSegments: grouped, ungroupedSegments: ungrouped }
  }, [segments])

  return (
    <div className="space-y-4">
      {/* Render groups */}
      {groups.map((group) => {
        const groupSegments = groupedSegments[group.id] || []
        return (
          <SegmentGroupSection
            key={group.id}
            group={group}
            segments={groupSegments}
            allSegments={segments}
            groups={groups}
            ledCount={ledCount}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={onSelectSegment}
          />
        )
      })}

      {/* Render ungrouped segments */}
      {ungroupedSegments.length > 0 && (
        <div className="space-y-2">
          {ungroupedSegments.map((segment) => (
            <SegmentDefinitionCard
              key={segment.id}
              segment={segment}
              ledCount={ledCount}
              isSelected={selectedSegmentId === segment.id}
              onSelect={() => onSelectSegment(segment.id)}
              segments={segments}
              groups={groups}
            />
          ))}
        </div>
      )}
    </div>
  )
}
