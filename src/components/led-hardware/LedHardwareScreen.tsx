import { useEffect, useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { RangeInput, ListSection } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Info, ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWledApi } from '@/api/wled'
import { getQueryKeys } from '@/hooks/useQueryKeys'
import { toast } from 'sonner'
import type { HardwareLedConfig, LedInstance } from '@/types/wled'
import { LedStripDialog } from './LedStripDialog'
import { PowerBudgetSection } from './PowerBudgetSection'
import { LedStripsList } from './LedStripsList'
import { getLedTypeName, getColorOrderName } from './constants'

interface LedHardwareScreenProps {
  baseUrl: string
  onBack: () => void
}

export function LedHardwareScreen({ baseUrl, onBack }: LedHardwareScreenProps) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)
  const keys = getQueryKeys(baseUrl)

  // Fetch LED hardware config
  const { data: config, isLoading } = useQuery({
    queryKey: keys.ledHardwareConfig,
    queryFn: () => api.getLedHardwareConfig(),
  })

  // Local state for form inputs
  const [totalLeds, setTotalLeds] = useState(0)
  const [maxPower, setMaxPower] = useState(0)
  const [maPerLed, setMaPerLed] = useState(0)
  const [targetFps, setTargetFps] = useState(0)
  const [strips, setStrips] = useState<LedInstance[]>([])

  // Strip editor dialog state
  const [editingStripIndex, setEditingStripIndex] = useState<number>(-1)
  const [stripDialogOpen, setStripDialogOpen] = useState(false)

  // Initialize form with server state when config loads
  // This is a valid pattern for form initialization from async data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (config) {
      setTotalLeds(config.total)
      setMaxPower(config.maxpwr)
      setMaPerLed(config.ledma)
      setTargetFps(config.fps)
      setStrips(config.ins)
    }
  }, [config])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<HardwareLedConfig>) =>
      api.setLedHardwareConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.ledHardwareConfig })
      toast.success('LED hardware settings updated', {
        description: 'Device will reboot to apply changes',
      })
    },
    onError: (error) => {
      toast.error('Failed to update settings')
      console.error(error)
    },
  })

  // Reboot mutation
  const rebootMutation = useMutation({
    mutationFn: () => api.reboot(),
    onSuccess: () => {
      toast.success('Device rebooting...', {
        description: 'Please wait 10-15 seconds for the device to restart',
      })
    },
    onError: (error) => {
      toast.error('Failed to reboot device')
      console.error(error)
    },
  })

  const handleSaveSettings = async () => {
    const updates: Partial<HardwareLedConfig> = {
      total: totalLeds,
      maxpwr: maxPower,
      ledma: maPerLed,
      fps: targetFps,
      ins: strips,
    }

    await updateMutation.mutateAsync(updates)
  }

  const handleReboot = async () => {
    await rebootMutation.mutateAsync()
  }

  const handleAddStrip = () => {
    setEditingStripIndex(-1)
    setStripDialogOpen(true)
  }

  const handleEditStrip = (index: number) => {
    setEditingStripIndex(index)
    setStripDialogOpen(true)
  }

  const handleDeleteStrip = (e: React.MouseEvent, index: number) => {
    e.stopPropagation() // Prevent triggering the row click
    if (confirm(`Delete LED Strip ${index + 1}?`)) {
      setStrips(strips.filter((_, i) => i !== index))
      toast.success(`LED Strip ${index + 1} deleted`)
    }
  }

  const handleSaveStrip = (strip: LedInstance) => {
    if (editingStripIndex === -1) {
      // Adding new strip
      setStrips([...strips, strip])
    } else {
      // Editing existing strip
      const newStrips = [...strips]
      newStrips[editingStripIndex] = strip
      setStrips(newStrips)
    }
  }

  if (isLoading || !config) {
    return (
      <ScreenContainer className="p-4">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </ScreenContainer>
    )
  }

  return (
    <ScreenContainer className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="ghost" size="icon" className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold flex-1">LED Hardware</h1>
      </div>

      {/* Total LEDs */}
      <ListSection title="LED Count">
        <div className="p-4 space-y-2">
          <RangeInput
            label={totalLeds.toString()}
            value={totalLeds}
            onChange={setTotalLeds}
            min={1}
            max={8192}
            step={1}
          />
          <div className="text-xs text-muted-foreground text-center">
            Total number of LEDs connected to this controller
          </div>
        </div>
      </ListSection>

      {/* Power Settings */}
      <PowerBudgetSection
        maxPower={maxPower}
        onMaxPowerChange={setMaxPower}
        maPerLed={maPerLed}
        onMaPerLedChange={setMaPerLed}
        totalLeds={totalLeds}
      />

      {/* Performance */}
      <ListSection title="Performance">
        <div className="p-4 space-y-2">
          <div className="text-sm font-medium">Target FPS</div>
          <RangeInput
            label={`${targetFps} fps`}
            value={targetFps}
            onChange={setTargetFps}
            min={1}
            max={120}
            step={1}
          />
          <div className="text-xs text-muted-foreground">
            Higher FPS = smoother animations but more CPU usage (typical: 30-60 fps)
          </div>
        </div>
      </ListSection>

      {/* LED Strips */}
      <LedStripsList
        strips={strips}
        onAddStrip={handleAddStrip}
        onEditStrip={handleEditStrip}
        onDeleteStrip={handleDeleteStrip}
        getLedTypeName={getLedTypeName}
        getColorOrderName={getColorOrderName}
      />

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">Important</p>
          <p>
            Changes to LED hardware settings require a device reboot to take effect.
            The device will automatically reboot when you save changes.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleSaveSettings}
          className="w-full"
          disabled={updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save & Reboot'}
        </Button>

        <Button
          onClick={handleReboot}
          variant="outline"
          className="w-full"
          disabled={rebootMutation.isPending}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {rebootMutation.isPending ? 'Rebooting...' : 'Reboot Device'}
        </Button>
      </div>

      {/* Strip Editor Dialog */}
      <LedStripDialog
        open={stripDialogOpen}
        onOpenChange={setStripDialogOpen}
        strip={editingStripIndex >= 0 ? strips[editingStripIndex] : null}
        stripIndex={editingStripIndex}
        onSave={handleSaveStrip}
      />
    </ScreenContainer>
  )
}
