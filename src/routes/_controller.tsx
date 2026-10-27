import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddControllerDialog } from '@/components/AddControllerDialog'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ControllerPickerSheet } from '@/components/more/ControllerPickerSheet'
import { MoreScreen } from '@/components/more/MoreScreen'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { ControllerContext } from '@/contexts/ControllerContext'
import { useControllers } from '@/hooks/useControllers'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { getLastController } from '@/lib/controllers'

export const Route = createFileRoute('/_controller')({
  beforeLoad: () => {
    if (!getLastController()) {
      throw redirect({ to: '/' })
    }
    return {}
  },
  component: ControllerLayout,
})

function ControllerLayout() {
  const navigate = useNavigate()
  const { controllers, addController, selectedUrl, selectController } = useControllers()

  // Modal states (kept as state, not in URL)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [controllerPickerOpen, setControllerPickerOpen] = useState(false)
  const [addControllerOpen, setAddControllerOpen] = useState(false)

  const selectedController = controllers.find((c) => c.url === selectedUrl) ?? null

  const goHome = useCallback(() => {
    selectController(null)
    navigate({ to: '/' })
  }, [selectController, navigate])

  // No (or a removed) controller selected: back to the controller list
  useEffect(() => {
    if (!selectedController) goHome()
  }, [selectedController, goHome])

  // The only WebSocket connection for all controller routes (WLED allows ~4
  // clients). Screens read it via useControllerContext().
  const connection = useWledWebSocket(selectedController?.url || '', {
    enabled: !!selectedController,
  })
  const { state, status } = connection

  const onOpenControllerPicker = useCallback(() => setMoreSheetOpen(true), [])

  const contextValue = useMemo(
    () => ({
      ...connection,
      // biome-ignore lint/style/noNonNullAssertion: the provider only renders with a controller
      controller: selectedController!,
      onOpenControllerPicker,
    }),
    [connection, selectedController, onOpenControllerPicker],
  )

  // The effect above redirects home
  if (!selectedController) {
    return null
  }

  // Connection screens only before the first data arrives; afterwards a
  // dropped connection must not unmount the screens (and their edits).
  if (!state && (status === 'connecting' || status === 'connected')) {
    return (
      <LoadingScreen
        className="min-h-screen flex flex-col justify-center"
        message={`Connecting to ${selectedController.name}...`}
      />
    )
  }

  if (!state) {
    return (
      <ErrorState
        className="min-h-screen"
        title="Connection Error"
        message={`Could not connect to ${selectedController.name} (${selectedController.url})`}
        onRetry={goHome}
        retryLabel="Back to Controllers"
      />
    )
  }

  return (
    <ControllerContext.Provider value={contextValue}>
      <Outlet key={selectedController.url} />

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
            onNavigate={() => setMoreSheetOpen(false)}
          />
        </DrawerContent>
      </Drawer>

      <ControllerPickerSheet
        open={controllerPickerOpen}
        onClose={() => setControllerPickerOpen(false)}
        currentControllerId={selectedController.url}
        onSelect={(id) => {
          if (id === null) {
            goHome()
          } else {
            selectController(id)
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
    </ControllerContext.Provider>
  )
}
