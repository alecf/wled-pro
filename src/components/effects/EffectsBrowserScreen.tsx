import { useState, useMemo } from 'react'
import { ScreenContainer } from '@/components/layout'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Search, Loader2, Wand2 } from 'lucide-react'
import { useEffects } from '@/hooks/useEffects'
import { EffectFlagBadges } from '@/components/common'
import { EffectParameterPreview } from './EffectParameterControls'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { Effect, EffectFlags } from '@/lib/effects'
import { cn } from '@/lib/utils'

interface EffectsBrowserScreenProps {
  baseUrl: string
}

type FilterType = keyof EffectFlags | 'all'

export function EffectsBrowserScreen({ baseUrl }: EffectsBrowserScreenProps) {
  const { effects, isLoading, error } = useEffects(baseUrl)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedEffect, setSelectedEffect] = useState<Effect | null>(null)

  const filteredEffects = useMemo(() => {
    if (!effects) return []

    return effects.filter((effect) => {
      // Search filter
      if (search && !effect.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }

      // Flag filter
      if (filter !== 'all' && !effect.flags[filter]) {
        return false
      }

      return true
    })
  }, [effects, search, filter])

  if (isLoading) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ScreenContainer>
    )
  }

  if (error) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-destructive mb-2">Failed to load effects</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer className="p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search effects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterChip
          label="1D"
          icon="⋮"
          active={filter === 'supports1D'}
          onClick={() => setFilter('supports1D')}
        />
        <FilterChip
          label="2D"
          icon="▦"
          active={filter === 'supports2D'}
          onClick={() => setFilter('supports2D')}
        />
        <FilterChip
          label="Volume"
          icon="♪"
          active={filter === 'volumeReactive'}
          onClick={() => setFilter('volumeReactive')}
        />
        <FilterChip
          label="Frequency"
          icon="♫"
          active={filter === 'frequencyReactive'}
          onClick={() => setFilter('frequencyReactive')}
        />
      </div>

      {/* Effect list */}
      {filteredEffects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wand2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Effects Found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEffects.map((effect) => (
            <Card
              key={effect.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedEffect(effect)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono w-8">
                      {effect.id}
                    </span>
                    <span className="font-medium">{effect.name}</span>
                  </div>
                  <EffectFlagBadges flags={effect.flags} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Effect detail sheet */}
      <Drawer
        open={selectedEffect !== null}
        onOpenChange={(open) => !open && setSelectedEffect(null)}
      >
        <DrawerContent>
          {selectedEffect && (
            <>
              <DrawerHeader>
                <DrawerTitle className="flex items-center gap-2">
                  <span>{selectedEffect.name}</span>
                  <EffectFlagBadges flags={selectedEffect.flags} />
                </DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6 space-y-4">
                <div className="text-sm text-muted-foreground">
                  Effect ID: {selectedEffect.id}
                </div>

                {selectedEffect.colors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Color Slots</h4>
                    <div className="space-y-1">
                      {selectedEffect.colors.map((color) => (
                        <div
                          key={color.index}
                          className="text-sm text-muted-foreground"
                        >
                          Slot {color.index + 1}: {color.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEffect.usesPalette && (
                  <div className="text-sm">
                    <span className="font-medium">Uses palette</span>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium mb-2">Parameters</h4>
                  <EffectParameterPreview effect={selectedEffect} />
                </div>

                <p className="text-xs text-muted-foreground">
                  This is a read-only preview. To use this effect, select it
                  when editing a segment in a Light Show.
                </p>
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </ScreenContainer>
  )
}

interface FilterChipProps {
  label: string
  icon?: string
  active: boolean
  onClick: () => void
}

function FilterChip({ label, icon, active, onClick }: FilterChipProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(
        'h-8',
        active && 'bg-primary text-primary-foreground'
      )}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </Button>
  )
}
