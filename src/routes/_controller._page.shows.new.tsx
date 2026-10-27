import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LightShowEditorScreen } from '@/components/shows/LightShowEditorScreen'

export const Route = createFileRoute('/_controller/_page/shows/new')({
  component: NewLightShowRoute,
})

function NewLightShowRoute() {
  const navigate = useNavigate()
  return <LightShowEditorScreen mode="current" onClose={() => navigate({ to: '/shows' })} />
}
