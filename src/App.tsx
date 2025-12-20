import { useState, useEffect, useMemo } from 'react'
import { useControllers } from '@/hooks/useControllers'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import { HomeScreen } from '@/components/HomeScreen'
import { AppShell, ControllerHeader, type TabId } from '@/components/navigation'
import { PresetsScreen, LightShowEditorScreen, type EditorMode } from '@/components/shows'
import { EffectsBrowserScreen } from '@/components/effects'
import { PalettesScreen } from '@/components/palettes'
import { DeviceInfoScreen } from '@/components/info'
import { MoreScreen, ControllerPickerSheet } from '@/components/more'
import { AddControllerDialog } from '@/components/AddControllerDialog'

const LAST_CONTROLLER_KEY = 'wled-pro:lastController'

function App() {
  const { controllers, addController } = useControllers()

  // Restore last selected controller from localStorage
  const [selectedControllerId, setSelectedControllerId] = useState<string | null>(() => {
    return localStorage.getItem(LAST_CONTROLLER_KEY)
  })

  // Tab navigation
  const [currentTab, setCurrentTab] = useState<TabId>('shows')

  // Sheet states
  const [controllerPickerOpen, setControllerPickerOpen] = useState(false)
  const [addControllerOpen, setAddControllerOpen] = useState(false)
  const [editorState, setEditorState] = useState<{
    active: boolean
    mode: EditorMode
    presetId?: number
  }>({ active: false, mode: 'current' })

  // Persist selected controller
  useEffect(() => {
    if (selectedControllerId) {
      localStorage.setItem(LAST_CONTROLLER_KEY, selectedControllerId)
    } else {
      localStorage.removeItem(LAST_CONTROLLER_KEY)
    }
  }, [selectedControllerId])

  // Find controller and auto-clear if deleted
  const selectedController = useMemo(() => {
    if (!selectedControllerId) return null
    const found = controllers.find((c) => c.id === selectedControllerId)
    // If controller was deleted, clear selection on next render via a timeout
    if (!found && controllers.length > 0) {
      setTimeout(() => setSelectedControllerId(null), 0)
    }
    return found ?? null
  }, [selectedControllerId, controllers])

  // No controller selected - show controller selection screen
  if (!selectedController) {
    return <HomeScreen onSelectController={setSelectedControllerId} />
  }

  // Controller selected - show main app with tabs
  return (
    <ControllerApp
      controller={selectedController}
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      controllerPickerOpen={controllerPickerOpen}
      onControllerPickerOpenChange={setControllerPickerOpen}
      onSelectController={setSelectedControllerId}
      addControllerOpen={addControllerOpen}
      onAddControllerOpenChange={setAddControllerOpen}
      onAddController={addController}
      editorState={editorState}
      setEditorState={setEditorState}
    />
  )
}

interface ControllerAppProps {
  controller: { id: string; name: string; url: string }
  currentTab: TabId
  onTabChange: (tab: TabId) => void
  controllerPickerOpen: boolean
  onControllerPickerOpenChange: (open: boolean) => void
  onSelectController: (id: string) => void
  addControllerOpen: boolean
  onAddControllerOpenChange: (open: boolean) => void
  onAddController: (url: string, name?: string) => void
  editorState: { active: boolean; mode: EditorMode; presetId?: number }
  setEditorState: (state: { active: boolean; mode: EditorMode; presetId?: number }) => void
}

function ControllerApp({
  controller,
  currentTab,
  onTabChange,
  controllerPickerOpen,
  onControllerPickerOpenChange,
  onSelectController,
  addControllerOpen,
  onAddControllerOpenChange,
  onAddController,
  editorState,
  setEditorState,
}: ControllerAppProps) {
  const { state, info, status, isConnected } = useWledWebSocket(controller.url)

  // Connection states
  if (status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Connecting to {controller.name}...</div>
      </div>
    )
  }

  if (status === 'error' || (status === 'disconnected' && !state)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-destructive">Connection Error</h2>
          <p className="text-muted-foreground">
            Could not connect to {controller.name}
          </p>
          <p className="text-sm text-muted-foreground">{controller.url}</p>
        </div>
      </div>
    )
  }

  // Show full-screen editor when active
  if (editorState.active) {
    return (
      <LightShowEditorScreen
        baseUrl={controller.url}
        mode={editorState.mode}
        presetId={editorState.presetId}
        onClose={() => setEditorState({ active: false, mode: 'current' })}
      />
    )
  }

  return (
    <>
      <AppShell currentTab={currentTab} onTabChange={onTabChange}>
        <ControllerHeader
          name={info?.name || controller.name}
          version={info?.ver}
          isConnected={isConnected}
          isReconnecting={status === 'disconnected' && !!state}
        />

        {currentTab === 'shows' && (
          <PresetsScreen
            baseUrl={controller.url}
            onEditCurrentState={() => setEditorState({ active: true, mode: 'current' })}
            onEditPreset={(id) => setEditorState({ active: true, mode: 'preset', presetId: id })}
          />
        )}
        {currentTab === 'effects' && <EffectsBrowserScreen baseUrl={controller.url} />}
        {currentTab === 'palettes' && <PalettesScreen />}
        {currentTab === 'info' && <DeviceInfoScreen info={info} />}
        {currentTab === 'more' && (
          <MoreScreen onSwitchController={() => onControllerPickerOpenChange(true)} />
        )}
      </AppShell>

      <ControllerPickerSheet
        open={controllerPickerOpen}
        onClose={() => onControllerPickerOpenChange(false)}
        currentControllerId={controller.id}
        onSelect={onSelectController}
        onAddController={() => onAddControllerOpenChange(true)}
      />

      <AddControllerDialog
        open={addControllerOpen}
        onOpenChange={onAddControllerOpenChange}
        onAdd={(c) => onAddController(c.url, c.name)}
      />
    </>
  )
}

export default App
