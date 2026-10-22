import { AlertTriangle, Check, Lock, RotateCcw, Shield, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { InfoBox } from '@/components/common/InfoBox'
import { ListItem, ListSection } from '@/components/common/List'
import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'
import { PasswordInput } from '@/components/common/PasswordInput'
import { SettingsPage } from '@/components/common/SettingsPage'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { useConfigEdits } from '@/hooks/useConfigEdits'
import {
  useFactoryReset,
  useFirmwareUpload,
  useSetOtaConfig,
  useWledFullConfig,
  useWledInfo,
} from '@/hooks/useWled'
import type { WledOtaConfig } from '@/types/wled'

interface SecurityScreenProps {
  baseUrl: string
  onBack: () => void
}

export function SecurityScreen({ baseUrl, onBack }: SecurityScreenProps) {
  const { data: config, isLoading, refetch } = useWledFullConfig(baseUrl)
  const { data: info } = useWledInfo(baseUrl)
  const setOtaConfig = useSetOtaConfig(baseUrl)
  const factoryReset = useFactoryReset(baseUrl)
  const firmwareUpload = useFirmwareUpload(baseUrl)

  // The lock field may be missing or unreliable; pskl > 0 also means a password is set.
  // Including the derived value in the base keeps it when other fields are edited.
  const serverOta: (WledOtaConfig & { psk?: string }) | undefined = config?.ota && {
    ...config.ota,
    lock: config.ota.lock ?? (config.ota.pskl ? config.ota.pskl > 0 : false),
  }
  const ota = useConfigEdits(serverOta)
  const formData = ota.formData

  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleSave = async () => {
    try {
      const dataToSave = { ...formData }
      if (!dataToSave.lock) {
        dataToSave.psk = '' // Clear password when disabling lock
      }
      await setOtaConfig.mutateAsync(dataToSave)
      toast.success('Security settings saved')
      // Refetch FIRST to get updated server state, THEN clear local edits
      await refetch()
      ota.reset()
    } catch (error) {
      toast.error('Failed to save settings')
      console.error(error)
    }
  }

  const handleFactoryReset = async () => {
    try {
      await factoryReset.mutateAsync()
      toast.success('Factory reset initiated. Device will reboot.')
      setShowFactoryResetDialog(false)
      // Navigate away since device will be reset
      onBack()
    } catch (error) {
      toast.error('Failed to initiate factory reset')
      console.error(error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.bin')) {
        toast.error('Please select a .bin firmware file')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleFirmwareUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadProgress(0)
      await firmwareUpload.mutateAsync({
        file: selectedFile,
        onProgress: setUploadProgress,
      })
      toast.success('Firmware uploaded successfully. Device will reboot.')
      setUploadProgress(null)
      setSelectedFile(null)
    } catch (error) {
      toast.error('Firmware upload failed')
      setUploadProgress(null)
      console.error(error)
    }
  }

  return (
    <SettingsPage
      title="Security & Updates"
      onBack={onBack}
      isLoading={isLoading}
      isDirty={ota.isDirty}
      isSaving={setOtaConfig.isPending}
      onSave={handleSave}
    >
      {/* Current Version */}
      {info && (
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Current Firmware</div>
              <div className="text-lg font-mono">{info.ver}</div>
            </div>
          </div>
        </div>
      )}

      <ListSection title="Update Protection">
        <ListItemWithIcon
          icon={Lock}
          title="OTA Lock"
          subtitle="Require password for firmware updates"
          rightElement={
            <Switch
              checked={formData.lock ?? false}
              onCheckedChange={(checked) => ota.setField('lock', checked)}
            />
          }
        />

        {formData.lock && (
          <ListItem>
            <div className="w-full space-y-2 py-2">
              <Label htmlFor="ota-password">OTA Password</Label>
              <PasswordInput
                id="ota-password"
                value={formData.psk ?? ''}
                onChange={(value) => ota.setField('psk', value)}
                currentLength={formData.pskl}
              />
              <p className="text-xs text-muted-foreground">
                {formData.pskl && formData.pskl > 0 ? (
                  <>
                    Current password: {formData.pskl} characters. Enter a new password to change it,
                    or turn off OTA Lock to remove protection.
                  </>
                ) : (
                  <>Default password is "wledota". Set a custom password for better security.</>
                )}
              </p>
            </div>
          </ListItem>
        )}

        <ListItemWithIcon
          icon={Lock}
          title="WiFi Lock"
          subtitle="Require password to change WiFi settings"
          rightElement={
            <Switch
              checked={formData['lock-wifi'] ?? false}
              onCheckedChange={(checked) => ota.setField('lock-wifi', checked)}
            />
          }
        />

        <ListItemWithIcon
          icon={Shield}
          title="ArduinoOTA"
          subtitle="Allow updates via Arduino IDE"
          rightElement={
            <Switch
              checked={formData.aota ?? false}
              onCheckedChange={(checked) => ota.setField('aota', checked)}
            />
          }
        />
      </ListSection>

      <ListSection title="Firmware Update">
        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Upload Firmware</div>
                <div className="text-sm text-muted-foreground">Select a .bin file to update</div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="file"
                accept=".bin"
                aria-label="Firmware file"
                onChange={handleFileSelect}
                className="flex-1 min-w-0 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
              <Button
                onClick={handleFirmwareUpload}
                disabled={!selectedFile || uploadProgress !== null}
                size="sm"
              >
                {uploadProgress !== null ? 'Uploading...' : 'Upload'}
              </Button>
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}

            {uploadProgress !== null && (
              <div className="space-y-1">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">{uploadProgress}%</p>
              </div>
            )}
          </div>
        </ListItem>
      </ListSection>

      <ListSection title="Danger Zone">
        <ListItemWithIcon
          icon={RotateCcw}
          iconClassName="text-destructive"
          title={<span className="text-destructive">Factory Reset</span>}
          subtitle="Erase all settings and presets"
          onClick={() => setShowFactoryResetDialog(true)}
          rightElement={<AlertTriangle className="h-5 w-5 text-destructive" />}
        />
      </ListSection>

      <InfoBox
        variant="muted"
        title="About Security"
        description="OTA lock prevents unauthorized firmware updates. If you forget the password, you'll need to perform a factory reset using the physical button (hold for 12+ seconds)."
      />

      <ConfirmationDialog
        open={showFactoryResetDialog}
        onOpenChange={setShowFactoryResetDialog}
        title="Factory Reset?"
        description="This will erase ALL settings, presets, and configurations. The device will revert to its default state and create a new WiFi access point. This action cannot be undone."
        confirmLabel="Factory Reset"
        confirmVariant="destructive"
        onConfirm={handleFactoryReset}
      />
    </SettingsPage>
  )
}
