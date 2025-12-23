import { useMemo } from 'react'
import { List } from '@/components/common'
import { SegmentGroupSection } from './SegmentGroupSection'
import { GlobalSegmentRow } from './GlobalSegmentRow'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'

interface SegmentDefinitionsListProps {
  segments: GlobalSegment[]
  groups: SegmentGroup[]
  ledCount: number
}

export function SegmentDefinitionsList({
  segments,
  groups,
  ledCount,
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
          />
        )
      })}

      {/* Render ungrouped segments */}
      {ungroupedSegments.length > 0 && (
        <List>
          {ungroupedSegments.map((segment) => (
            <GlobalSegmentRow
              key={segment.id}
              segment={segment}
              segments={segments}
              groups={groups}
              ledCount={ledCount}
            />
          ))}
        </List>
      )}
    </div>
  )
}
