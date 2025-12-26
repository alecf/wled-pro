import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { TimerScreen } from '@/components/timer'
import { ControllerHeader } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/settings/timer')({
  component: TimerComponent,
})

function TimerComponent() {
  const navigate = useNavigate()
  const { controller, info, isConnected, status, state } = useControllerContext()

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
      />
      <TimerScreen baseUrl={controller.url} />
      <Button
        onClick={() => navigate({ to: '/shows' })}
        variant="ghost"
        className="absolute top-4 left-4 z-10"
      >
        Back
      </Button>
    </div>
  )
}
