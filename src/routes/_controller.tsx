import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useControllers } from '@/hooks/useControllers'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { ControllerPickerSheet, MoreScreen } from '@/components/more'
import { AddControllerDialog } from '@/components/AddControllerDialog'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { WledState, WledInfo } from '@/types/wled'

interface ControllerContext {
  controller: { id: string; name: string; url: string }
  state: WledState | null
  info: WledInfo | null
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  isConnected: boolean
  onOpenControllerPicker: () => void
}

export const Route = createFileRoute('/_controller')({
  beforeLoad: () => {
    const lastControllerId = localStorage.getItem('wled-pro:lastController')
    if (!lastControllerId) {
      throw redirect({ to: '/' })
    }
  },
  component: ControllerLayout,
})

function ControllerLayout() {
  const navigate = useNavigate()
  const { controllers, addController } = useControllers()

  // Get controller from localStorage
  const selectedControllerId = localStorage.getItem('wled-pro:lastController')
  const selectedController = useMemo(() => {
    if (!selectedControllerId) return null
    const found = controllers.find((c) => c.id === selectedControllerId)
    // If deleted, clear and redirect
    if (!found && controllers.length > 0) {
      localStorage.removeItem('wled-pro:lastController')
      navigate({ to: '/' })
      return null
    }
    return found ?? null
  }, [selectedControllerId, controllers, navigate])

  // Modal states (kept as state, not in URL)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [controllerPickerOpen, setControllerPickerOpen] = useState(false)
  const [addControllerOpen, setAddControllerOpen] = useState(false)

  if (!selectedController) {
    return null // Will redirect via beforeLoad
  }

  // CRITICAL: Single WebSocket connection for ALL controller routes
  const { state, info, status, isConnected } = useWledWebSocket(selectedController.url)

  // Connection states
  if (status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Connecting to {selectedController.name}...</div>
      </div>
    )
  }

  if (status === 'error' || (status === 'disconnected' && !state)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-destructive">Connection Error</h2>
            <p className="text-muted-foreground">
              Could not connect to {selectedController.name}
            </p>
            <p className="text-sm text-muted-foreground">{selectedController.url}</p>
          </div>
          <Button
            onClick={() => {
              localStorage.removeItem('wled-pro:lastController')
              navigate({ to: '/' })
            }}
          >
            Back to Controllers
          </Button>
        </div>
      </div>
    )
  }

  const context: ControllerContext = {
    controller: selectedController,
    state,
    info,
    status,
    isConnected,
    onOpenControllerPicker: () => setMoreSheetOpen(true),
  }

  return (
    <>
      <Outlet context={context} />

      <Drawer open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>More</DrawerTitle>
          </DrawerHeader>
          <MoreScreen
            onSwitchController={() => {
              setMoreSheetOpen(false)
              setControllerPickerOpen(true)
            }}
            onNavigateToTimer={() => {
              setMoreSheetOpen(false)
              navigate({ to: '/settings/timer' })
            }}
            onNavigateToSchedules={() => {
              setMoreSheetOpen(false)
              navigate({ to: '/settings/schedules' })
            }}
            onNavigateToTimeLocation={() => {
              setMoreSheetOpen(false)
              navigate({ to: '/settings/time-location' })
            }}
          />
        </DrawerContent>
      </Drawer>

      <ControllerPickerSheet
        open={controllerPickerOpen}
        onClose={() => setControllerPickerOpen(false)}
        currentControllerId={selectedController.id}
        onSelect={(id) => {
          if (id === null) {
            localStorage.removeItem('wled-pro:lastController')
            navigate({ to: '/' })
          } else {
            localStorage.setItem('wled-pro:lastController', id)
            setControllerPickerOpen(false)
          }
        }}
        onAddController={() => setAddControllerOpen(true)}
      />

      <AddControllerDialog
        open={addControllerOpen}
        onOpenChange={setAddControllerOpen}
        onAdd={(c) => addController(c.url, c.name)}
      />
    </>
  )
}
