import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

interface AddControllerDialogProps {
  onAdd: (controller: { url: string; name?: string }) => void
  /** If provided, dialog is controlled externally */
  open?: boolean
  /** If provided, dialog is controlled externally */
  onOpenChange?: (open: boolean) => void
  /** If true, don't render the trigger button (use with controlled mode) */
  hideTrigger?: boolean
}

export function AddControllerDialog({
  onAdd,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
}: AddControllerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    onAdd({ url: url.trim(), name: name.trim() || undefined })
    setUrl('')
    setName('')
    setOpen(false)
  }

  const dialogContent = (
    <DialogContent className="sm:max-w-[425px]">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Add WLED Controller</DialogTitle>
          <DialogDescription>
            Enter the IP address or hostname of your WLED device.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="url">Address</Label>
            <Input
              id="url"
              placeholder="192.168.1.100 or wled.local"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="Living Room LEDs"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!url.trim()}>
            Add
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )

  if (hideTrigger || isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Add Controller
        </Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  )
}
