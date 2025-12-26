import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PresetsScreen } from '@/components/shows'

export const Route = createFileRoute('/_controller/_tabbed/shows')({
  component: ShowsComponent,
})

function ShowsComponent() {
  const navigate = useNavigate()
  const { controller } = Route.useRouteContext()

  return (
    <PresetsScreen
      baseUrl={controller.url}
      onEditCurrentState={() => navigate({ to: '/shows/current' })}
      onEditPreset={(id) => navigate({ to: '/shows/$presetId', params: { presetId: String(id) } })}
    />
  )
}
