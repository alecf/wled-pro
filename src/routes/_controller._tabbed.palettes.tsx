import { createFileRoute } from '@tanstack/react-router'
import { PalettesScreen } from '@/components/palettes/PalettesScreen'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed/palettes')({
  component: PalettesComponent,
})

function PalettesComponent() {
  const { controller } = useControllerContext()

  return <PalettesScreen baseUrl={controller.url} />
}
