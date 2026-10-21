import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ControllerHeader } from '@/components/navigation/ControllerHeader'
import { PlaylistScreen } from '@/components/playlists/PlaylistScreen'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/settings/playlist')({
  component: PlaylistComponent,
})

function PlaylistComponent() {
  const navigate = useNavigate()
  const { controller, info, isConnected, isPolling, status, state } = useControllerContext()

  if (!controller) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ControllerHeader
        name={info?.name || controller.name}
        version={info?.ver}
        isConnected={isConnected}
        isReconnecting={status === 'disconnected' && !!state}
        isPolling={isPolling}
      />
      <PlaylistScreen baseUrl={controller.url} onBack={() => navigate({ to: '/shows' })} />
    </div>
  )
}
