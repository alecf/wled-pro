import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { PresetsScreen } from '@/components/shows/PresetsScreen'
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

  const handleEditPreset = useCallback(
    (id: number) => {
      navigate({ to: '/shows/$presetId', params: { presetId: String(id) } })
    },
    [navigate],
  )

  return (
    <PresetsScreen
      baseUrl={controller.url}
      onEditCurrentState={handleEditCurrentState}
      onEditPreset={handleEditPreset}
    />
  )
}
