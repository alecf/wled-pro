import { SimpleInputDialog } from '@/components/common/SimpleInputDialog'

interface CreateGroupDialogProps {
  open: boolean
  onCreateGroup: (name: string) => void
  onClose: () => void
}

export function CreateGroupDialog({
  open,
  onCreateGroup,
  onClose,
}: CreateGroupDialogProps) {
  return (
    <SimpleInputDialog
      open={open}
      onOpenChange={onClose}
      title="Create Group"
      fieldLabel="Group Name"
      placeholder="Enter group name"
      onSubmit={onCreateGroup}
      submitLabel="Create"
    />
  )
}
