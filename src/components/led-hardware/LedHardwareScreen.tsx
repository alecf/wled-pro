import { useEffect, useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { RangeInput, ListSection } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Zap, Info, ArrowLeft, Save, RefreshCw, Plus, Trash2, Edit } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWledApi } from '@/api/wled'
import { toast } from 'sonner'
import type { HardwareLedConfig, LedInstance } from '@/types/wled'
import { LedStripDialog } from './LedStripDialog'

interface LedHardwareScreenProps {
  baseUrl: string
  onBack: () => void
}

// Color order mapping
const COLOR_ORDERS = [
  { id: 0, name: 'GRB' },
  { id: 1, name: 'RGB' },
  { id: 2, name: 'BRG' },
  { id: 3, name: 'RBG' },
  { id: 4, name: 'GBR' },
  { id: 5, name: 'BGR' },
  { id: 6, name: 'WRGB' },
  { id: 7, name: 'WRBG' },
  { id: 8, name: 'WGRB' },
  { id: 9, name: 'WGBR' },
  { id: 10, name: 'WBRG' },
  { id: 11, name: 'WBGR' },
  { id: 12, name: 'RGBW' },
  { id: 13, name: 'RBGW' },
  { id: 14, name: 'GRBW' },
  { id: 15, name: 'GBRW' },
  { id: 16, name: 'BRGW' },
  { id: 17, name: 'BGRW' },
]

export function LedHardwareScreen({ baseUrl, onBack }: LedHardwareScreenProps) {
  const queryClient = useQueryClient()
  const api = getWledApi(baseUrl)

  // Fetch LED hardware config
  const { data: config, isLoading } = useQuery({
    queryKey: ['wled', baseUrl, 'ledHardwareConfig'],
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

  // Sync with server state
  useEffect(() => {
    if (config) {
      setTotalLeds(config.total)
      setMaxPower(config.maxpwr)
      setMaPerLed(config.ledma)
      setTargetFps(config.fps)
      setStrips(config.ins)
    }
  }, [config])

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<HardwareLedConfig>) =>
      api.setLedHardwareConfig(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wled', baseUrl, 'ledHardwareConfig'] })
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

  const handleDeleteStrip = (index: number) => {
    if (confirm(`Delete LED Strip ${index + 1}?`)) {
      setStrips(strips.filter((_, i) => i !== index))
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

  const estimatedPower = totalLeds * maPerLed
  const powerBudgetPercent = maxPower > 0
    ? Math.round((estimatedPower / maxPower) * 100)
    : 0

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
      <ListSection title="Power Budget">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium">Max Power (mA)</div>
            <RangeInput
              label={`${maxPower} mA`}
              value={maxPower}
              onChange={setMaxPower}
              min={0}
              max={65000}
              step={50}
            />
            <div className="text-xs text-muted-foreground">
              Maximum power budget for the LED strip (0 = unlimited)
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">mA per LED</div>
            <RangeInput
              label={`${maPerLed} mA`}
              value={maPerLed}
              onChange={setMaPerLed}
              min={0}
              max={255}
              step={1}
            />
            <div className="text-xs text-muted-foreground">
              Estimated power consumption per LED (typically 35-60mA)
            </div>
          </div>

          {maxPower > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                <span className="font-medium">Estimated usage:</span>
                <span className={powerBudgetPercent > 100 ? 'text-destructive' : 'text-muted-foreground'}>
                  {estimatedPower} mA ({powerBudgetPercent}% of budget)
                </span>
              </div>
              {powerBudgetPercent > 100 && (
                <div className="text-xs text-destructive mt-1">
                  Warning: Estimated power exceeds budget. WLED will limit brightness to stay within budget.
                </div>
              )}
            </div>
          )}
        </div>
      </ListSection>

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
      <ListSection title="LED Strips">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {strips.length} strip{strips.length !== 1 ? 's' : ''} configured
            </div>
            <Button
              onClick={handleAddStrip}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Strip
            </Button>
          </div>

          {strips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No LED strips configured. Click "Add Strip" to get started.
            </div>
          ) : (
            strips.map((instance, idx) => (
              <div
                key={idx}
                className="p-3 border border-border rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Strip {idx + 1}</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEditStrip(idx)}
                      size="sm"
                      variant="ghost"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteStrip(idx)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">GPIO: </span>
                    <span className="font-mono">{instance.pin.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">LEDs: </span>
                    <span>{instance.start}-{instance.start + instance.len - 1} ({instance.len})</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Order: </span>
                    <span>{COLOR_ORDERS.find(o => o.id === instance.order)?.name || instance.order}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span>{instance.type}</span>
                  </div>
                </div>
                {(instance.rev || instance.ref || instance.skip > 0) && (
                  <div className="text-xs text-muted-foreground">
                    {instance.rev && <span className="mr-2">• Reversed</span>}
                    {instance.ref && <span className="mr-2">• Mirrored</span>}
                    {instance.skip > 0 && <span>• Skip {instance.skip}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ListSection>

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
