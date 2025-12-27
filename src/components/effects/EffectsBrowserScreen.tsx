import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Wand2 } from 'lucide-react'
import { useEffects } from '@/hooks/useEffects'
import { EffectFlagBadges, LoadingScreen, ErrorState, EmptyState } from '@/components/common'
import { EffectParameterPreview } from './EffectParameterControls'
import { List, ListItem } from '@/components/common'
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
      <>
        <Header
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
        />
        <LoadingScreen message="Loading effects..." />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
        />
        <div className="p-4">
          <ErrorState
            title="Failed to load effects"
            message={error.message}
          />
        </div>
      </>
    )
  }

  return (
    <>
      <Header
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
      />

      <div className="p-4">
        {/* Effect list */}
        {filteredEffects.length === 0 ? (
          <EmptyState
            icon={Wand2}
            title="No Effects Found"
            description="Try adjusting your search or filters"
          />
        ) : (
          <List>
            {filteredEffects.map((effect) => (
              <ListItem key={effect.id} onClick={() => setSelectedEffect(effect)}>
                <div className="flex items-center justify-between min-h-[48px]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono w-8">
                      {effect.id}
                    </span>
                    <span className="font-medium">{effect.name}</span>
                  </div>
                  <EffectFlagBadges flags={effect.flags} />
                </div>
              </ListItem>
            ))}
          </List>
        )}
      </div>

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
    </>
  )
}

interface HeaderProps {
  search: string
  onSearchChange: (value: string) => void
  filter: FilterType
  onFilterChange: (value: FilterType) => void
}

function Header({ search, onSearchChange, filter, onFilterChange }: HeaderProps) {
  return (
    <header
      className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
    >
      <div className="p-4 space-y-3">
        <h1 className="text-lg font-semibold">Effects</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search effects..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="All"
            active={filter === 'all'}
            onClick={() => onFilterChange('all')}
          />
          <FilterChip
            label="1D"
            icon="⋮"
            active={filter === 'supports1D'}
            onClick={() => onFilterChange('supports1D')}
          />
          <FilterChip
            label="2D"
            icon="▦"
            active={filter === 'supports2D'}
            onClick={() => onFilterChange('supports2D')}
          />
          <FilterChip
            label="Volume"
            icon="♪"
            active={filter === 'volumeReactive'}
            onClick={() => onFilterChange('volumeReactive')}
          />
          <FilterChip
            label="Frequency"
            icon="♫"
            active={filter === 'frequencyReactive'}
            onClick={() => onFilterChange('frequencyReactive')}
          />
        </div>
      </div>
    </header>
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
