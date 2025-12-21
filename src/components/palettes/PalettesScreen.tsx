import { ScreenContainer } from '@/components/layout'
import { PaletteColorStrip, List, ListItem } from '@/components/common'
import { useWledPalettesWithColors } from '@/hooks/useWled'
import { useControllers } from '@/hooks/useControllers'

export function PalettesScreen() {
  const { controllers } = useControllers()
  const firstController = controllers[0]
  const { data: palettes, isLoading } = useWledPalettesWithColors(
    firstController?.url || ''
  )

  if (isLoading) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading palettes...</div>
        </div>
      </ScreenContainer>
    )
  }

  if (!palettes || palettes.length === 0) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-muted-foreground">No palettes available</p>
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer className="p-4">
      <List>
        {palettes.map((palette) => (
          <ListItem key={palette.id}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate flex-1">{palette.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">#{palette.id}</span>
              </div>
              <div className="px-2">
                <PaletteColorStrip colors={palette.colors} />
              </div>
            </div>
          </ListItem>
        ))}
      </List>
    </ScreenContainer>
  )
}
