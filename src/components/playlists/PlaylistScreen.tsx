import { useState, useMemo } from 'react'
import { ScreenContainer } from '@/components/layout'
import { ListSection, ListItem } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { EmptyState } from '@/components/common/EmptyState'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Play,
  Square,
  Plus,
  Trash2,
  GripVertical,
  ListMusic,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react'
import { usePresets } from '@/hooks/usePresets'
import { useWledWebSocket } from '@/hooks/useWledWebSocket'
import {
  useStartPlaylist,
  useStopPlaylist,
  useSavePlaylist,
} from '@/hooks/useWled'
import { toast } from 'sonner'
import type { WledPlaylist, ParsedPreset } from '@/types/wled'

interface PlaylistScreenProps {
  baseUrl: string
  onBack: () => void
}

interface PlaylistItem {
  presetId: number
  duration: number // seconds
  transition: number // tenths of a second
}

export function PlaylistScreen({ baseUrl, onBack }: PlaylistScreenProps) {
  const { presets, playlist: savedPlaylist, isLoading } = usePresets(baseUrl)
  const { state } = useWledWebSocket(baseUrl)
  const startPlaylist = useStartPlaylist(baseUrl)
  const stopPlaylist = useStopPlaylist(baseUrl)
  const savePlaylist = useSavePlaylist(baseUrl)

  // Local playlist state
  const [items, setItems] = useState<PlaylistItem[]>(() => {
    if (savedPlaylist) {
      return savedPlaylist.ps.map((presetId, idx) => ({
        presetId,
        duration: (savedPlaylist.dur[idx] || 100) / 10, // Convert from ×100ms to seconds
        transition: savedPlaylist.transition?.[idx] ?? 7,
      }))
    }
    return []
  })
  const [repeat, setRepeat] = useState(savedPlaylist?.repeat ?? 0)
  const [endPreset, setEndPreset] = useState(savedPlaylist?.end ?? 0)
  const [hasChanges, setHasChanges] = useState(false)

  // Dialogs
  const [addPresetDialogOpen, setAddPresetDialogOpen] = useState(false)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  // Is a playlist currently playing?
  const isPlaying = state?.pl !== undefined && state.pl > 0

  // Create a map of preset ID to preset for quick lookup
  const presetMap = useMemo(() => {
    const map = new Map<number, ParsedPreset>()
    presets.forEach((p) => map.set(p.id, p))
    return map
  }, [presets])

  const handleAddPreset = (presetId: number) => {
    setItems([...items, { presetId, duration: 10, transition: 7 }])
    setHasChanges(true)
    setAddPresetDialogOpen(false)
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= items.length) return
    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    setItems(newItems)
    setHasChanges(true)
  }

  const handleDurationChange = (index: number, duration: number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], duration }
    setItems(newItems)
    setHasChanges(true)
  }

  const handleTransitionChange = (index: number, transition: number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], transition }
    setItems(newItems)
    setHasChanges(true)
  }

  const handleRepeatChange = (value: number) => {
    setRepeat(value)
    setHasChanges(true)
  }

  const handleEndPresetChange = (value: number) => {
    setEndPreset(value)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error('Add at least one preset to the playlist')
      return
    }

    try {
      const playlist: WledPlaylist = {
        ps: items.map((item) => item.presetId),
        dur: items.map((item) => item.duration * 10), // Convert seconds to ×100ms
        transition: items.map((item) => item.transition),
        repeat,
        end: endPreset,
      }
      await savePlaylist.mutateAsync(playlist)
      toast.success('Playlist saved')
      setHasChanges(false)
    } catch (error) {
      toast.error('Failed to save playlist')
      console.error(error)
    }
  }

  const handlePlay = async () => {
    if (items.length === 0) {
      toast.error('Add at least one preset to the playlist')
      return
    }

    // Save first if there are unsaved changes
    if (hasChanges) {
      await handleSave()
    }

    try {
      await startPlaylist.mutateAsync(1) // Playlist ID is always 1
      toast.success('Playlist started')
    } catch (error) {
      toast.error('Failed to start playlist')
      console.error(error)
    }
  }

  const handleStop = async () => {
    try {
      await stopPlaylist.mutateAsync()
      toast.success('Playlist stopped')
    } catch (error) {
      toast.error('Failed to stop playlist')
      console.error(error)
    }
  }

  const handleClear = () => {
    setItems([])
    setRepeat(0)
    setEndPreset(0)
    setHasChanges(true)
    setClearConfirmOpen(false)
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  // Available presets (not already in playlist)
  const availablePresets = presets.filter(
    (p) => !items.some((item) => item.presetId === p.id)
  )

  return (
    <ScreenContainer className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="ghost" size="icon" className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold flex-1">Playlist</h1>
        {hasChanges && (
          <Button
            onClick={handleSave}
            size="sm"
            disabled={savePlaylist.isPending}
          >
            Save
          </Button>
        )}
      </div>

      {/* Playback Controls */}
      <div className="flex gap-3">
        {isPlaying ? (
          <Button
            onClick={handleStop}
            className="flex-1"
            variant="outline"
            disabled={stopPlaylist.isPending}
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Playlist
          </Button>
        ) : (
          <Button
            onClick={handlePlay}
            className="flex-1"
            disabled={items.length === 0 || startPlaylist.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Play Playlist
          </Button>
        )}
      </div>

      {/* Currently Playing Indicator */}
      {isPlaying && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-600 dark:text-green-400">
            Playlist is currently playing
          </span>
        </div>
      )}

      {/* Playlist Items */}
      {items.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title="Empty Playlist"
          description="Add presets to create a playlist that cycles through your light shows"
        />
      ) : (
        <ListSection title={`Playlist Items (${items.length})`}>
          {items.map((item, index) => {
            const preset = presetMap.get(item.presetId)
            return (
              <ListItem key={`${item.presetId}-${index}`}>
                <div className="w-full space-y-3 py-2">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <span className="flex-1 font-medium truncate">
                      {preset?.n || `Preset ${item.presetId}`}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveItem(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveItem(index, 'down')}
                        disabled={index === items.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 pl-10">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">
                        Duration (seconds)
                      </Label>
                      <input
                        type="number"
                        min="1"
                        max="6553"
                        value={item.duration}
                        onChange={(e) =>
                          handleDurationChange(index, parseInt(e.target.value) || 10)
                        }
                        className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">
                        Transition (0.1s)
                      </Label>
                      <input
                        type="number"
                        min="0"
                        max="255"
                        value={item.transition}
                        onChange={(e) =>
                          handleTransitionChange(index, parseInt(e.target.value) || 7)
                        }
                        className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </ListItem>
            )
          })}
        </ListSection>
      )}

      {/* Add Preset Button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setAddPresetDialogOpen(true)}
        disabled={availablePresets.length === 0}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Preset
      </Button>

      {/* Playlist Options */}
      <ListSection title="Options">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <div className="flex-1">
              <div className="font-medium">Repeat Count</div>
              <div className="text-sm text-muted-foreground">
                0 = infinite loop
              </div>
            </div>
            <input
              type="number"
              min="0"
              max="255"
              value={repeat}
              onChange={(e) => handleRepeatChange(parseInt(e.target.value) || 0)}
              className="w-20 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <div className="flex-1">
              <div className="font-medium">End Preset</div>
              <div className="text-sm text-muted-foreground">
                Preset to load when playlist ends (0 = stay on last)
              </div>
            </div>
            <select
              value={endPreset}
              onChange={(e) => handleEndPresetChange(parseInt(e.target.value) || 0)}
              className="w-32 h-10 rounded-md border border-input bg-background px-2 py-2 text-sm"
            >
              <option value={0}>Stay on last</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.n}
                </option>
              ))}
            </select>
          </div>
        </ListItem>
      </ListSection>

      {/* Clear Playlist */}
      {items.length > 0 && (
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/50"
          onClick={() => setClearConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear Playlist
        </Button>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About Playlists</p>
          <p>
            Playlists automatically cycle through your saved light shows.
            Each preset plays for the specified duration before transitioning
            to the next. Set repeat to 0 for infinite looping.
          </p>
        </div>
      </div>

      {/* Add Preset Dialog */}
      <Dialog open={addPresetDialogOpen} onOpenChange={setAddPresetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Preset to Playlist</DialogTitle>
            <DialogDescription>Select a preset to add to the playlist</DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {availablePresets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All presets are already in the playlist
              </p>
            ) : (
              availablePresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleAddPreset(preset.id)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="font-medium">{preset.n}</div>
                  <div className="text-xs text-muted-foreground">
                    Preset #{preset.id}
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation */}
      <ConfirmationDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear Playlist?"
        description="This will remove all presets from the playlist."
        confirmLabel="Clear"
        confirmVariant="destructive"
        onConfirm={handleClear}
      />
    </ScreenContainer>
  )
}
