import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Check, Plus, Wifi } from 'lucide-react'
import { useControllers } from '@/hooks/useControllers'
import { cn } from '@/lib/utils'

interface ControllerPickerSheetProps {
  open: boolean
  onClose: () => void
  currentControllerId: string | null
  onSelect: (id: string) => void
  onAddController: () => void
}

export function ControllerPickerSheet({
  open,
  onClose,
  currentControllerId,
  onSelect,
  onAddController,
}: ControllerPickerSheetProps) {
  const { controllers } = useControllers()

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Switch Controller</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-2">
          {controllers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No controllers configured
            </div>
          ) : (
            controllers.map((controller) => {
              const isSelected = controller.url === currentControllerId

              return (
                <button
                  key={controller.url}
                  onClick={() => {
                    onSelect(controller.url)
                    onClose()
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full p-3 text-left rounded-lg transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <Wifi className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{controller.name}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {controller.url}
                    </div>
                  </div>
                  {isSelected && <Check className="h-5 w-5 flex-shrink-0" />}
                </button>
              )
            })
          )}

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => {
              onAddController()
              onClose()
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Controller
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
