import { createFileRoute } from '@tanstack/react-router'
import { EffectsBrowserScreen } from '@/components/effects'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed/effects')({
  component: EffectsComponent,
})

function EffectsComponent() {
  const { controller } = useControllerContext()

  if (!controller) {
    return null
  }

  return <EffectsBrowserScreen baseUrl={controller.url} />
}
