import { createFileRoute } from '@tanstack/react-router'
import { EffectsBrowserScreen } from '@/components/effects'

export const Route = createFileRoute('/_controller/_tabbed/effects')({
  component: EffectsComponent,
})

function EffectsComponent() {
  const { controller } = Route.useRouteContext()
  return <EffectsBrowserScreen baseUrl={controller.url} />
}
