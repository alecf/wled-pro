import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LightShowEditorScreen } from '@/components/shows/LightShowEditorScreen'

export const Route = createFileRoute('/_controller/_page/shows/current')({
  component: CurrentStateEditorRoute,
})

function CurrentStateEditorRoute() {
  const navigate = useNavigate()
  return <LightShowEditorScreen mode="current" onClose={() => navigate({ to: '/shows' })} />
}
