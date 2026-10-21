import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { List } from '@/components/common/List'
import { SimpleInputDialog } from '@/components/common/SimpleInputDialog'
import { Button } from '@/components/ui/button'
import { useSegmentDefinitions } from '@/hooks/useSegmentDefinitions'
import type { GlobalSegment, SegmentGroup } from '@/types/segments'
import { GlobalSegmentRow } from './GlobalSegmentRow'

interface SegmentGroupSectionProps {
  group: SegmentGroup
  segments: GlobalSegment[]
  allSegments: GlobalSegment[]
  groups: SegmentGroup[]
  ledCount: number
  controllerId: string
}

export function SegmentGroupSection({
  group,
  segments,
  allSegments,
  groups,
  ledCount,
  controllerId,
}: SegmentGroupSectionProps) {
  const { renameGroup, removeGroup } = useSegmentDefinitions(controllerId)
  const [isExpanded, setIsExpanded] = useState(true)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <div className="space-y-2">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 rounded-md transition-colors">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-2 text-left"
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
        {/* Always visible: hover-only controls can't be reached on touch devices */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              setShowRenameDialog(true)
            }}
            title="Rename group"
            aria-label="Rename group"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteDialog(true)
            }}
            title="Delete group"
            aria-label="Delete group"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

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
              controllerId={controllerId}
            />
          ))}
        </List>
      )}

      <SimpleInputDialog
        open={showRenameDialog}
        onOpenChange={setShowRenameDialog}
        title="Rename Group"
        fieldLabel="Group Name"
        placeholder="Enter group name"
        defaultValue={group.name}
        onSubmit={(newName) => renameGroup(group.id, newName)}
        submitLabel="Rename"
      />

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Group"
        description={`Are you sure you want to delete "${group.name}"? Segments will be unassigned but not deleted.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={() => removeGroup(group.id)}
      />
    </div>
  )
}
