import { MessageSquare, Mic, Radio } from 'lucide-react'
import { toast } from 'sonner'
import { InfoBox } from '@/components/common/InfoBox'
import { ListItem, ListSection } from '@/components/common/List'
import { ListItemWithIcon } from '@/components/common/ListItemWithIcon'
import { PasswordInput } from '@/components/common/PasswordInput'
import { RebootPrompt } from '@/components/common/RebootPrompt'
import { SettingsPage } from '@/components/common/SettingsPage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useConfigEdits } from '@/hooks/useConfigEdits'
import {
  useSetAlexaConfig,
  useSetMqttConfig,
  useSetSyncConfig,
  useWledFullConfig,
} from '@/hooks/useWled'
import type { WledMqttConfig } from '@/types/wled'

interface SyncScreenProps {
  baseUrl: string
  onBack: () => void
}

interface TextFieldRowProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function TextFieldRow({ id, label, value, onChange, placeholder }: TextFieldRowProps) {
  return (
    <ListItem>
      <div className="w-full space-y-2 py-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </ListItem>
  )
}

export function SyncScreen({ baseUrl, onBack }: SyncScreenProps) {
  const { data: config, isLoading, refetch: refetchConfig } = useWledFullConfig(baseUrl)
  const setSyncConfig = useSetSyncConfig(baseUrl)
  const setMqttConfig = useSetMqttConfig(baseUrl)
  const setAlexaConfig = useSetAlexaConfig(baseUrl)

  // Sync, MQTT and Alexa settings all live under config.if
  const sync = useConfigEdits(config?.if?.sync)
  const mqtt = useConfigEdits<WledMqttConfig & { psk?: string }>(config?.if?.mqtt)
  const alexa = useConfigEdits(config?.if?.va)
  const syncFormData = sync.formData
  const mqttFormData = mqtt.formData
  const alexaFormData = alexa.formData
  const isDirty = sync.isDirty || mqtt.isDirty || alexa.isDirty

  /** Saves changed sections and clears edits; throws on failure. */
  const save = async () => {
    if (sync.isDirty) {
      await setSyncConfig.mutateAsync(syncFormData)
    }
    if (mqtt.isDirty) {
      await setMqttConfig.mutateAsync(mqttFormData)
    }
    if (alexa.isDirty) {
      await setAlexaConfig.mutateAsync(alexaFormData)
    }
    toast.success('Sync settings saved. Some changes may require a reboot.')
    // Refetch FIRST to get updated server state, THEN clear local edits
    await refetchConfig()
    sync.reset()
    mqtt.reset()
    alexa.reset()
  }

  const handleSave = () =>
    save().catch((error) => {
      toast.error('Failed to save settings')
      console.error(error)
    })

  return (
    <SettingsPage
      title="Sync Settings"
      onBack={onBack}
      isLoading={isLoading}
      isDirty={isDirty}
      isSaving={setSyncConfig.isPending || setMqttConfig.isPending || setAlexaConfig.isPending}
      onSave={handleSave}
    >
      <RebootPrompt
        baseUrl={baseUrl}
        show={isDirty}
        onSaveBeforeReboot={save}
        message="Some sync settings require a device reboot to take effect."
      />

      <ListSection title="UDP Sync">
        <ListItemWithIcon
          icon={Radio}
          title="UDP Port"
          subtitle="Port for device sync communication"
          rightElement={
            <Input
              type="number"
              aria-label="UDP Port"
              value={syncFormData.port0 ?? 21324}
              onChange={(e) => sync.setField('port0', parseInt(e.target.value, 10) || 21324)}
              className="w-24 text-right"
            />
          }
        />

        <ListItemWithIcon
          title="Receive Brightness"
          subtitle="Apply brightness from other WLED devices"
          rightElement={
            <Switch
              checked={syncFormData.recv?.bri ?? true}
              onCheckedChange={(checked) => sync.setNested('recv', 'bri', checked)}
            />
          }
        />

        <ListItemWithIcon
          title="Receive Colors"
          subtitle="Apply color changes from other devices"
          rightElement={
            <Switch
              checked={syncFormData.recv?.col ?? true}
              onCheckedChange={(checked) => sync.setNested('recv', 'col', checked)}
            />
          }
        />

        <ListItemWithIcon
          title="Receive Effects"
          subtitle="Apply effect changes from other devices"
          rightElement={
            <Switch
              checked={syncFormData.recv?.fx ?? true}
              onCheckedChange={(checked) => sync.setNested('recv', 'fx', checked)}
            />
          }
        />

        <ListItemWithIcon
          title="Send on Direct Change"
          subtitle="Broadcast when values change"
          rightElement={
            <Switch
              checked={syncFormData.send?.dir ?? true}
              onCheckedChange={(checked) => sync.setNested('send', 'dir', checked)}
            />
          }
        />

        <ListItemWithIcon
          title="Send on Button Press"
          subtitle="Broadcast when button is pressed"
          rightElement={
            <Switch
              checked={syncFormData.send?.btn ?? true}
              onCheckedChange={(checked) => sync.setNested('send', 'btn', checked)}
            />
          }
        />

        <ListItemWithIcon
          title="Sync Group"
          subtitle="Only sync with devices in the same group (1-255)"
          rightElement={
            <Input
              type="number"
              aria-label="Sync Group"
              min={1}
              max={255}
              value={syncFormData.recv?.grp ?? 1}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10) || 1
                sync.setNested('recv', 'grp', val)
                sync.setNested('send', 'grp', val)
              }}
              className="w-20 text-right"
            />
          }
        />
      </ListSection>

      <ListSection title="MQTT">
        <ListItemWithIcon
          icon={MessageSquare}
          title="Enable MQTT"
          subtitle="Connect to an MQTT broker for home automation"
          rightElement={
            <Switch
              checked={mqttFormData.en ?? false}
              onCheckedChange={(checked) => mqtt.setField('en', checked)}
            />
          }
        />

        {mqttFormData.en && (
          <>
            <TextFieldRow
              id="mqtt-broker"
              label="Broker Address"
              value={mqttFormData.broker ?? ''}
              onChange={(value) => mqtt.setField('broker', value)}
              placeholder="192.168.1.100 or mqtt.example.com"
            />

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-port">Port</Label>
                <Input
                  id="mqtt-port"
                  type="number"
                  value={mqttFormData.port ?? 1883}
                  onChange={(e) => mqtt.setField('port', parseInt(e.target.value, 10) || 1883)}
                />
              </div>
            </ListItem>

            <TextFieldRow
              id="mqtt-user"
              label="Username (optional)"
              value={mqttFormData.user ?? ''}
              onChange={(value) => mqtt.setField('user', value)}
              placeholder="Leave blank for anonymous"
            />

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-password">Password</Label>
                <PasswordInput
                  id="mqtt-password"
                  value={mqttFormData.psk ?? ''}
                  onChange={(value) => mqtt.setField('psk', value)}
                  currentLength={mqttFormData.pskl}
                />
              </div>
            </ListItem>

            <TextFieldRow
              id="mqtt-client-id"
              label="Client ID"
              value={mqttFormData.cid ?? ''}
              onChange={(value) => mqtt.setField('cid', value)}
              placeholder="Leave blank to auto-generate"
            />

            <TextFieldRow
              id="mqtt-device-topic"
              label="Device Topic"
              value={mqttFormData.topics?.device ?? 'wled/test'}
              onChange={(value) => mqtt.setNested('topics', 'device', value)}
              placeholder="wled/devicename"
            />

            <TextFieldRow
              id="mqtt-group-topic"
              label="Group Topic"
              value={mqttFormData.topics?.group ?? 'wled/all'}
              onChange={(value) => mqtt.setNested('topics', 'group', value)}
              placeholder="wled/all"
            />

            <ListItemWithIcon
              title="Retain Messages"
              subtitle="Broker retains last published state"
              rightElement={
                <Switch
                  checked={mqttFormData.rtn ?? false}
                  onCheckedChange={(checked) => mqtt.setField('rtn', checked)}
                />
              }
            />
          </>
        )}
      </ListSection>

      <ListSection title="Voice Assistant">
        <ListItemWithIcon
          icon={Mic}
          title="Alexa Emulation"
          subtitle="Allow Amazon Alexa to discover this device"
          rightElement={
            <Switch
              checked={alexaFormData.alexa ?? false}
              onCheckedChange={(checked) => alexa.setField('alexa', checked)}
            />
          }
        />

        {alexaFormData.alexa && (
          <ListItem>
            <div className="w-full py-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Say "Alexa, discover devices" to find this WLED device. Once discovered, you can
                  control it by saying:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1">
                  <li>"Alexa, turn on/off [device name]"</li>
                  <li>"Alexa, set [device name] to 50%"</li>
                  <li>"Alexa, set [device name] to red"</li>
                </ul>
              </div>
            </div>
          </ListItem>
        )}
      </ListSection>

      <InfoBox
        variant="muted"
        title="About Sync Settings"
        description="UDP sync allows multiple WLED devices to synchronize effects, colors, and brightness. MQTT enables integration with home automation systems like Home Assistant. Alexa emulation allows voice control without any cloud connection."
      />
    </SettingsPage>
  )
}
