import { ArrowLeft, Info, RefreshCw, Save } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { ListSection } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { RangeInput } from '@/components/common/RangeInput'
import { ScreenContainer } from '@/components/layout/ScreenContainer'
import { Button } from '@/components/ui/button'
import { useLedHardwareConfig, useRebootDevice, useSetLedHardwareConfig } from '@/hooks/useWled'
import type { HardwareLedConfig, LedInstance } from '@/types/wled'
import { getColorOrderName, getLedTypeName } from './constants'
import { LedStripDialog } from './LedStripDialog'
import { LedStripsList } from './LedStripsList'
import { PowerBudgetSection } from './PowerBudgetSection'

interface LedHardwareScreenProps {
  baseUrl: string
  onBack: () => void
}

export function LedHardwareScreen({ baseUrl, onBack }: LedHardwareScreenProps) {
  const { data: config } = useLedHardwareConfig(baseUrl)

  // The form is seeded from config once; refetches don't overwrite edits
  if (!config) {
    return <LoadingScreen />
  }
  return <LedHardwareForm baseUrl={baseUrl} onBack={onBack} config={config} />
}

function LedHardwareForm({
  baseUrl,
  onBack,
  config,
}: LedHardwareScreenProps & { config: HardwareLedConfig }) {
  const updateMutation = useSetLedHardwareConfig(baseUrl)
  const rebootMutation = useRebootDevice(baseUrl)

  const [totalLeds, setTotalLeds] = useState(config.total)
  const [maxPower, setMaxPower] = useState(config.maxpwr)
  const [maPerLed, setMaPerLed] = useState(config.ledma)
  const [targetFps, setTargetFps] = useState(config.fps)
  const [strips, setStrips] = useState<LedInstance[]>(config.ins)

  // Strip editor dialog state
  const [editingStripIndex, setEditingStripIndex] = useState<number>(-1)
  const [stripDialogOpen, setStripDialogOpen] = useState(false)
  const [stripToDelete, setStripToDelete] = useState<number | null>(null)

  const handleSaveSettings = async () => {
    try {
      await updateMutation.mutateAsync({
        total: totalLeds,
        maxpwr: maxPower,
        ledma: maPerLed,
        fps: targetFps,
        ins: strips,
      })
      toast.success('LED hardware settings saved', {
        description: 'Reboot the device to apply them',
      })
    } catch (error) {
      toast.error('Failed to update settings')
      console.error(error)
    }
  }

  const handleReboot = async () => {
    try {
      await rebootMutation.mutateAsync()
      toast.success('Device rebooting...', {
        description: 'Please wait 10-15 seconds for the device to restart',
      })
    } catch (error) {
      toast.error('Failed to reboot device')
      console.error(error)
    }
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
    setStripToDelete(index)
  }

  const confirmDeleteStrip = () => {
    if (stripToDelete === null) return
    setStrips(strips.filter((_, i) => i !== stripToDelete))
    setStripToDelete(null)
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
            Changes to LED hardware settings take effect after the device reboots. Save your
            changes, then reboot the device.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button onClick={handleSaveSettings} className="w-full" disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? 'Saving...' : 'Save'}
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

      <ConfirmationDialog
        open={stripToDelete !== null}
        onOpenChange={(open) => !open && setStripToDelete(null)}
        title={`Delete LED Strip ${(stripToDelete ?? 0) + 1}?`}
        description="The strip is removed when you save."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={confirmDeleteStrip}
      />
    </ScreenContainer>
  )
}
