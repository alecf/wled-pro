import { useState } from 'react'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { ListSection } from '@/components/common/List'
import { RangeInput } from '@/components/common/RangeInput'
import { RebootPrompt } from '@/components/common/RebootPrompt'
import { SettingsPage } from '@/components/common/SettingsPage'
import { useControllerContext } from '@/contexts/ControllerContext'
import { useConfigEdits } from '@/hooks/useConfigEdits'
import { useSettingsForm } from '@/hooks/useSettingsForm'
import { useLedHardwareConfig } from '@/hooks/useWled'
import type { HardwareLedConfig, LedInstance } from '@/types/wled'
import { getColorOrderName, getLedTypeName } from './constants'
import { LedStripDialog } from './LedStripDialog'
import { LedStripsList } from './LedStripsList'
import { PowerBudgetSection } from './PowerBudgetSection'

interface LedHardwareScreenProps {
  onBack: () => void
}

export function LedHardwareScreen({ onBack }: LedHardwareScreenProps) {
  const baseUrl = useControllerContext().controller.url
  const { data: config } = useLedHardwareConfig(baseUrl)
  const led = useConfigEdits(config)
  // Edits layered over the device's config (the page shows a spinner until it has loaded)
  const form = led.formData as HardwareLedConfig
  const strips = form.ins ?? []
  const setStrips = (ins: LedInstance[]) => led.setField('ins', ins)
  // Saved changes only apply after a reboot. The prompt is always shown (it is this screen's
  // Reboot button), but only warns while there are unsaved or not-yet-applied changes.
  const [needsReboot, setNeedsReboot] = useState(false)

  const { isDirty, isSaving, save, handleSave } = useSettingsForm(baseUrl, {
    sections: { led },
    // Only the fields this screen edits: echoing the rest of hw.led from the cached config
    // could revert changes made elsewhere (e.g. in WLED's own UI)
    toPatch: ({ led }) =>
      led
        ? {
            hw: {
              led: {
                total: led.total,
                maxpwr: led.maxpwr,
                ledma: led.ledma,
                fps: led.fps,
                ins: led.ins,
              },
            },
          }
        : {},
    successMessage: 'LED hardware settings saved. Reboot the device to apply them.',
    onSaved: () => setNeedsReboot(true),
  })

  // Strip editor dialog state
  const [editingStripIndex, setEditingStripIndex] = useState<number>(-1)
  const [stripDialogOpen, setStripDialogOpen] = useState(false)
  const [stripToDelete, setStripToDelete] = useState<number | null>(null)

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

  if (!config) {
    return <SettingsPage title="LED Hardware" onBack={onBack} isLoading />
  }

  return (
    <SettingsPage
      title="LED Hardware"
      onBack={onBack}
      isDirty={isDirty}
      isSaving={isSaving}
      onSave={handleSave}
    >
      <RebootPrompt
        baseUrl={baseUrl}
        show
        title={isDirty || needsReboot ? 'Reboot Recommended' : 'Reboot Device'}
        onSaveBeforeReboot={isDirty ? save : undefined}
        onReconnected={() => setNeedsReboot(false)}
        message="LED hardware changes take effect after the device reboots."
      />

      {/* Total LEDs */}
      <ListSection title="LED Count">
        <div className="p-4 space-y-2">
          <RangeInput
            label={form.total.toString()}
            value={form.total}
            onChange={(total) => led.setField('total', total)}
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
        maxPower={form.maxpwr}
        onMaxPowerChange={(maxpwr) => led.setField('maxpwr', maxpwr)}
        maPerLed={form.ledma}
        onMaPerLedChange={(ledma) => led.setField('ledma', ledma)}
        totalLeds={form.total}
      />

      {/* Performance */}
      <ListSection title="Performance">
        <div className="p-4 space-y-2">
          <div className="text-sm font-medium">Target FPS</div>
          <RangeInput
            label={`${form.fps} fps`}
            value={form.fps}
            onChange={(fps) => led.setField('fps', fps)}
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
    </SettingsPage>
  )
}
