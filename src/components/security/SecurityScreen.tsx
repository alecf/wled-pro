import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { ListSection, ListItem } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Lock,
  Shield,
  Upload,
  RotateCcw,
  Info,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
} from 'lucide-react'
import {
  useWledFullConfig,
  useSetOtaConfig,
  useFactoryReset,
  useFirmwareUpload,
  useWledInfo,
} from '@/hooks/useWled'
import { toast } from 'sonner'
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

  const [hasChanges, setHasChanges] = useState(false)
  const [localEdits, setLocalEdits] = useState<Partial<WledOtaConfig & { psk?: string }> | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Determine if OTA lock is enabled from server data
  // Use pskl > 0 as indicator since lock field may not be reliable
  const serverOtaLock = config?.ota?.lock ?? (config?.ota?.pskl ? config.ota.pskl > 0 : false)

  // Use local edits if user has made changes, otherwise use server data
  const formData: Partial<WledOtaConfig & { psk?: string }> = localEdits ?? {
    ...config?.ota,
    lock: serverOtaLock,
  }

  const handleChange = (field: keyof (WledOtaConfig & { psk?: string }), value: unknown) => {
    setLocalEdits((prev) => ({ ...(prev ?? config?.ota ?? {}), [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      // If turning off lock, send empty password to clear it
      const dataToSave = { ...formData }
      if (!dataToSave.lock) {
        dataToSave.psk = '' // Clear password when disabling lock
      }
      await setOtaConfig.mutateAsync(dataToSave)
      toast.success('Security settings saved')
      setLocalEdits(null)
      setHasChanges(false)
      // Refetch to get updated server state
      await refetch()
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
      // Validate file type
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

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ScreenContainer className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button onClick={onBack} variant="ghost" size="icon" className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold flex-1">Security & Updates</h1>
        {hasChanges && (
          <Button onClick={handleSave} size="sm" disabled={setOtaConfig.isPending}>
            {setOtaConfig.isPending ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>

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

      {/* OTA Lock */}
      <ListSection title="Update Protection">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">OTA Lock</div>
              <div className="text-sm text-muted-foreground">
                Require password for firmware updates
              </div>
            </div>
            <Switch
              checked={formData.lock ?? false}
              onCheckedChange={(checked) => handleChange('lock', checked)}
            />
          </div>
        </ListItem>

        {formData.lock && (
          <ListItem>
            <div className="w-full space-y-2 py-2">
              <Label htmlFor="ota-password">OTA Password</Label>
              <div className="relative">
                <input
                  id="ota-password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.psk ?? ''}
                  onChange={(e) => handleChange('psk', e.target.value)}
                  placeholder={formData.pskl ? `Current: ${formData.pskl} characters` : 'Enter password'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.pskl && formData.pskl > 0 ? (
                  <>Current password: {formData.pskl} characters. Enter a new password to change it, or turn off OTA Lock to remove protection.</>
                ) : (
                  <>Default password is "wledota". Set a custom password for better security.</>
                )}
              </p>
            </div>
          </ListItem>
        )}

        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">WiFi Lock</div>
              <div className="text-sm text-muted-foreground">
                Require password to change WiFi settings
              </div>
            </div>
            <Switch
              checked={formData['lock-wifi'] ?? false}
              onCheckedChange={(checked) => handleChange('lock-wifi', checked)}
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">ArduinoOTA</div>
              <div className="text-sm text-muted-foreground">
                Allow updates via Arduino IDE
              </div>
            </div>
            <Switch
              checked={formData.aota ?? false}
              onCheckedChange={(checked) => handleChange('aota', checked)}
            />
          </div>
        </ListItem>
      </ListSection>

      {/* Firmware Update */}
      <ListSection title="Firmware Update">
        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">Upload Firmware</div>
                <div className="text-sm text-muted-foreground">
                  Select a .bin file to update
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="file"
                accept=".bin"
                onChange={handleFileSelect}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
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
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
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

      {/* Danger Zone */}
      <ListSection title="Danger Zone">
        <ListItem onClick={() => setShowFactoryResetDialog(true)}>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <RotateCcw className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <div className="font-medium text-destructive">Factory Reset</div>
              <div className="text-sm text-muted-foreground">
                Erase all settings and presets
              </div>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        </ListItem>
      </ListSection>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About Security</p>
          <p>
            OTA lock prevents unauthorized firmware updates. If you forget the password,
            you'll need to perform a factory reset using the physical button (hold for 12+ seconds).
          </p>
        </div>
      </div>

      {/* Factory Reset Confirmation */}
      <ConfirmationDialog
        open={showFactoryResetDialog}
        onOpenChange={setShowFactoryResetDialog}
        title="Factory Reset?"
        description="This will erase ALL settings, presets, and configurations. The device will revert to its default state and create a new WiFi access point. This action cannot be undone."
        confirmLabel="Factory Reset"
        confirmVariant="destructive"
        onConfirm={handleFactoryReset}
      />
    </ScreenContainer>
  )
}
