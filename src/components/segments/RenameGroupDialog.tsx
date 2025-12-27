import { SimpleInputDialog } from '@/components/common/SimpleInputDialog'

interface RenameGroupDialogProps {
  open: boolean
  currentName: string
  onRename: (newName: string) => void
  onClose: () => void
}

export function RenameGroupDialog({
  open,
  currentName,
  onRename,
  onClose,
}: RenameGroupDialogProps) {
  return (
    <SimpleInputDialog
      open={open}
      onOpenChange={onClose}
      title="Rename Group"
      fieldLabel="Group Name"
      placeholder="Enter group name"
      defaultValue={currentName}
      onSubmit={onRename}
      submitLabel="Rename"
    />
  )
}
