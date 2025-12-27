import { PaletteColorStrip, List, ListItem, LoadingScreen, EmptyState } from '@/components/common'
import { useWledPalettesWithColors } from '@/hooks/useWled'
import { useControllers } from '@/hooks/useControllers'
import { Palette } from 'lucide-react'

export function PalettesScreen() {
  const { controllers } = useControllers()
  const firstController = controllers[0]
  const { data: palettes, isLoading } = useWledPalettesWithColors(
    firstController?.url || ''
  )

  if (isLoading) {
    return (
      <>
        <Header />
        <LoadingScreen message="Loading palettes..." />
      </>
    )
  }

  if (!palettes || palettes.length === 0) {
    return (
      <>
        <Header />
        <div className="p-4">
          <EmptyState
            icon={Palette}
            title="No Palettes Available"
            description="Could not load color palettes from the device"
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="p-4">
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
      </div>
    </>
  )
}

function Header() {
  return (
    <header
      className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
    >
      <div className="flex items-center h-14 px-4">
        <h1 className="text-lg font-semibold">Palettes</h1>
      </div>
    </header>
  )
}
