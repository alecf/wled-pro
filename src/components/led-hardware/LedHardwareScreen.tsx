import { useEffect, useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { RangeInput, ListSection, ListItem } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Zap, Info, ArrowLeft, Save, RefreshCw, Plus, Trash2 } from 'lucide-react'
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

const LED_TYPES = [
  { id: 22, name: 'WS2812B (RGB)' },
  { id: 31, name: 'SK6812 RGBW' },
  { id: 24, name: 'WS2801' },
  { id: 25, name: 'APA102' },
  { id: 26, name: 'LPD8806' },
  { id: 27, name: 'P9813' },
  { id: 30, name: 'TM1814' },
  { id: 32, name: 'TM1829' },
  { id: 33, name: 'UCS8903' },
  { id: 34, name: 'GS8208' },
  { id: 35, name: 'WS2811 400kHz' },
  { id: 36, name: 'SK6812 WWA' },
  { id: 37, name: 'UCS8904' },
  { id: 40, name: 'PWM White' },
  { id: 41, name: 'PWM CCT' },
  { id: 42, name: 'PWM RGB' },
  { id: 43, name: 'PWM RGBW' },
  { id: 44, name: 'PWM RGB+CCT' },
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

  const handleDeleteStrip = (e: React.MouseEvent, index: number) => {
    e.stopPropagation() // Prevent triggering the row click
    if (confirm(`Delete LED Strip ${index + 1}?`)) {
      setStrips(strips.filter((_, i) => i !== index))
      toast.success(`LED Strip ${index + 1} deleted`)
    }
  }

  const getLedTypeName = (typeId: number): string => {
    return LED_TYPES.find(t => t.id === typeId)?.name || `Type ${typeId}`
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
        {strips.length === 0 ? (
          <div className="px-4 py-8">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground text-sm">
                No LED strips configured
              </p>
              <Button
                onClick={handleAddStrip}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Strip
              </Button>
            </div>
          </div>
        ) : (
          <>
            {strips.map((instance, idx) => (
              <ListItem
                key={idx}
                onClick={() => handleEditStrip(idx)}
              >
                <div className="flex items-center justify-between min-h-[48px]">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Strip {idx + 1}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        GPIO {instance.pin.join(', ')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getLedTypeName(instance.type)} • {COLOR_ORDERS.find(o => o.id === instance.order)?.name || instance.order} • LEDs {instance.start}-{instance.start + instance.len - 1} ({instance.len})
                      {(instance.rev || instance.ref || instance.skip > 0) && (
                        <>
                          {instance.rev && ' • Reversed'}
                          {instance.ref && ' • Mirrored'}
                          {instance.skip > 0 && ` • Skip ${instance.skip}`}
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={(e) => handleDeleteStrip(e, idx)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </ListItem>
            ))}
            <div className="px-4 py-3 border-t border-[var(--color-list-divider)] bg-[var(--color-list-item-bg)]">
              <Button
                onClick={handleAddStrip}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Strip
              </Button>
            </div>
          </>
        )}
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
