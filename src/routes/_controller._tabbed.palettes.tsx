import { createFileRoute } from '@tanstack/react-router'
import { PalettesScreen } from '@/components/palettes/PalettesScreen'

export const Route = createFileRoute('/_controller/_tabbed/palettes')({
  component: PalettesComponent,
})

function PalettesComponent() {
  return <PalettesScreen />
}
