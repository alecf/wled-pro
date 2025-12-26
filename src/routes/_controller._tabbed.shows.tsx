import { useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PresetsScreen } from '@/components/shows'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed/shows')({
  component: ShowsComponent,
})

function ShowsComponent() {
  const navigate = useNavigate()
  const { controller } = useControllerContext()

  const handleEditCurrentState = useCallback(() => {
    navigate({ to: '/shows/current' })
  }, [navigate])

  const handleEditPreset = useCallback((id: number) => {
    navigate({ to: '/shows/$presetId', params: { presetId: String(id) } })
  }, [navigate])

  console.log('[ShowsComponent] Render')

  if (!controller) {
    return null
  }

  return (
    <PresetsScreen
      baseUrl={controller.url}
      onEditCurrentState={handleEditCurrentState}
      onEditPreset={handleEditPreset}
    />
  )
}
