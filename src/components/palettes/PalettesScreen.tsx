import { ScreenContainer } from '@/components/layout'
import { Palette } from 'lucide-react'

export function PalettesScreen() {
  return (
    <ScreenContainer className="p-4">
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Palette className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Palettes</h2>
        <p className="text-muted-foreground">
          Browse color palettes
        </p>
      </div>
    </ScreenContainer>
  )
}
