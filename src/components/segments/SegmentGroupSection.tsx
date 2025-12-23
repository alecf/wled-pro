import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { List } from '@/components/common'
import { GlobalSegmentRow } from './GlobalSegmentRow'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'

interface SegmentGroupSectionProps {
  group: SegmentGroup
  segments: GlobalSegment[]
  allSegments: GlobalSegment[]
  groups: SegmentGroup[]
  ledCount: number
}

export function SegmentGroupSection({
  group,
  segments,
  allSegments,
  groups,
  ledCount,
}: SegmentGroupSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="space-y-2">
      {/* Group header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 rounded-md transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <h3 className="font-semibold text-sm">{group.name}</h3>
        <span className="text-xs text-muted-foreground">
          ({segments.length} {segments.length === 1 ? 'segment' : 'segments'})
        </span>
      </button>

      {/* Group segments */}
      {isExpanded && (
        <List className="pl-6">
          {segments.map((segment) => (
            <GlobalSegmentRow
              key={segment.id}
              segment={segment}
              segments={allSegments}
              groups={groups}
              ledCount={ledCount}
            />
          ))}
        </List>
      )}
    </div>
  )
}
