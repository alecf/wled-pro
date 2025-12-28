import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { WifiScreen } from '@/components/wifi'
import { ControllerHeader } from '@/components/navigation'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/settings/wifi')({
  component: WifiComponent,
})

function WifiComponent() {
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
      <WifiScreen
        baseUrl={controller.url}
        onBack={() => navigate({ to: '/shows' })}
      />
    </div>
  )
}
