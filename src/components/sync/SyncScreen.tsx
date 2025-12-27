import { useState } from 'react'
import { ScreenContainer } from '@/components/layout'
import { ListSection, ListItem } from '@/components/common/List'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { RebootPrompt } from '@/components/common/RebootPrompt'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Radio,
  MessageSquare,
  Mic,
  Eye,
  EyeOff,
  Info,
} from 'lucide-react'
import {
  useWledFullConfig,
  useSetSyncConfig,
  useSetMqttConfig,
  useSetAlexaConfig,
} from '@/hooks/useWled'
import { toast } from 'sonner'
import type { WledSyncConfig, WledMqttConfig, WledAlexaConfig } from '@/types/wled'

interface SyncScreenProps {
  baseUrl: string
  onBack: () => void
}

export function SyncScreen({ baseUrl, onBack }: SyncScreenProps) {
  const { data: config, isLoading, refetch: refetchConfig } = useWledFullConfig(baseUrl)
  const setSyncConfig = useSetSyncConfig(baseUrl)
  const setMqttConfig = useSetMqttConfig(baseUrl)
  const setAlexaConfig = useSetAlexaConfig(baseUrl)

  const [hasChanges, setHasChanges] = useState(false)
  const [showMqttPassword, setShowMqttPassword] = useState(false)

  // Local state for edits
  const [syncEdits, setSyncEdits] = useState<Partial<WledSyncConfig> | null>(null)
  const [mqttEdits, setMqttEdits] = useState<Partial<WledMqttConfig & { psk?: string }> | null>(null)
  const [alexaEdits, setAlexaEdits] = useState<Partial<WledAlexaConfig> | null>(null)

  // Merge edits with current config (sync settings are under config.if)
  const syncFormData = {
    port0: syncEdits?.port0 ?? config?.if?.sync?.port0,
    port1: syncEdits?.port1 ?? config?.if?.sync?.port1,
    recv: {
      bri: syncEdits?.recv?.bri ?? config?.if?.sync?.recv?.bri,
      col: syncEdits?.recv?.col ?? config?.if?.sync?.recv?.col,
      fx: syncEdits?.recv?.fx ?? config?.if?.sync?.recv?.fx,
      grp: syncEdits?.recv?.grp ?? config?.if?.sync?.recv?.grp,
      seg: syncEdits?.recv?.seg ?? config?.if?.sync?.recv?.seg,
      sb: syncEdits?.recv?.sb ?? config?.if?.sync?.recv?.sb,
    },
    send: {
      dir: syncEdits?.send?.dir ?? config?.if?.sync?.send?.dir,
      btn: syncEdits?.send?.btn ?? config?.if?.sync?.send?.btn,
      va: syncEdits?.send?.va ?? config?.if?.sync?.send?.va,
      hue: syncEdits?.send?.hue ?? config?.if?.sync?.send?.hue,
      macro: syncEdits?.send?.macro ?? config?.if?.sync?.send?.macro,
      grp: syncEdits?.send?.grp ?? config?.if?.sync?.send?.grp,
      ret: syncEdits?.send?.ret ?? config?.if?.sync?.send?.ret,
    },
  }

  const mqttFormData = {
    en: mqttEdits?.en ?? config?.if?.mqtt?.en,
    broker: mqttEdits?.broker ?? config?.if?.mqtt?.broker,
    port: mqttEdits?.port ?? config?.if?.mqtt?.port,
    user: mqttEdits?.user ?? config?.if?.mqtt?.user,
    pskl: config?.if?.mqtt?.pskl,
    psk: mqttEdits?.psk,
    cid: mqttEdits?.cid ?? config?.if?.mqtt?.cid,
    rtn: mqttEdits?.rtn ?? config?.if?.mqtt?.rtn,
    topics: {
      device: mqttEdits?.topics?.device ?? config?.if?.mqtt?.topics?.device,
      group: mqttEdits?.topics?.group ?? config?.if?.mqtt?.topics?.group,
    },
  }

  const alexaFormData = {
    alexa: alexaEdits?.alexa ?? config?.if?.va?.alexa,
    macros: alexaEdits?.macros ?? config?.if?.va?.macros,
    p: alexaEdits?.p ?? config?.if?.va?.p,
  }

  const handleSyncChange = (field: string, value: unknown) => {
    if (field.startsWith('recv.')) {
      const key = field.replace('recv.', '') as keyof WledSyncConfig['recv']
      setSyncEdits((prev) => {
        const newRecv = { ...(prev?.recv ?? {}), [key]: value } as WledSyncConfig['recv']
        return { ...(prev ?? {}), recv: newRecv }
      })
    } else if (field.startsWith('send.')) {
      const key = field.replace('send.', '') as keyof WledSyncConfig['send']
      setSyncEdits((prev) => {
        const newSend = { ...(prev?.send ?? {}), [key]: value } as WledSyncConfig['send']
        return { ...(prev ?? {}), send: newSend }
      })
    } else {
      setSyncEdits((prev) => ({ ...(prev ?? {}), [field]: value }))
    }
    setHasChanges(true)
  }

  const handleMqttChange = (field: string, value: unknown) => {
    if (field.startsWith('topics.')) {
      const key = field.replace('topics.', '') as keyof WledMqttConfig['topics']
      setMqttEdits((prev) => {
        const newTopics = { ...(prev?.topics ?? {}), [key]: value } as WledMqttConfig['topics']
        return { ...(prev ?? {}), topics: newTopics }
      })
    } else {
      setMqttEdits((prev) => ({ ...(prev ?? {}), [field]: value }))
    }
    setHasChanges(true)
  }

  const handleAlexaChange = (field: keyof WledAlexaConfig, value: unknown) => {
    setAlexaEdits((prev) => ({ ...(prev ?? {}), [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      // Save sync config if changed
      if (syncEdits) {
        await setSyncConfig.mutateAsync(syncFormData as WledSyncConfig)
      }
      // Save MQTT config if changed
      if (mqttEdits) {
        await setMqttConfig.mutateAsync(mqttFormData as WledMqttConfig)
      }
      // Save Alexa config if changed
      if (alexaEdits) {
        await setAlexaConfig.mutateAsync(alexaFormData as WledAlexaConfig)
      }
      toast.success('Sync settings saved. Some changes may require a reboot.')
      // Refetch FIRST to get updated server state, THEN clear local edits
      await refetchConfig()
      setSyncEdits(null)
      setMqttEdits(null)
      setAlexaEdits(null)
      setHasChanges(false)
    } catch (error) {
      toast.error('Failed to save settings')
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
        <h1 className="text-xl font-semibold flex-1">Sync Settings</h1>
        {hasChanges && (
          <Button
            onClick={handleSave}
            size="sm"
            disabled={setSyncConfig.isPending || setMqttConfig.isPending || setAlexaConfig.isPending}
          >
            Save
          </Button>
        )}
      </div>

      {/* Reboot Prompt */}
      <RebootPrompt
        baseUrl={baseUrl}
        hasChanges={hasChanges}
        onSaveBeforeReboot={handleSave}
        message="Some sync settings require a device reboot to take effect."
      />

      {/* UDP Sync */}
      <ListSection title="UDP Sync">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Radio className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">UDP Port</div>
              <div className="text-sm text-muted-foreground">
                Port for device sync communication
              </div>
            </div>
            <input
              type="number"
              value={syncFormData.port0 ?? 21324}
              onChange={(e) => handleSyncChange('port0', parseInt(e.target.value) || 21324)}
              className="w-24 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
            />
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Receive Brightness</div>
                <div className="text-sm text-muted-foreground">
                  Apply brightness from other WLED devices
                </div>
              </div>
              <Switch
                checked={syncFormData.recv?.bri ?? true}
                onCheckedChange={(checked) => handleSyncChange('recv.bri', checked)}
              />
            </div>
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Receive Colors</div>
                <div className="text-sm text-muted-foreground">
                  Apply color changes from other devices
                </div>
              </div>
              <Switch
                checked={syncFormData.recv?.col ?? true}
                onCheckedChange={(checked) => handleSyncChange('recv.col', checked)}
              />
            </div>
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Receive Effects</div>
                <div className="text-sm text-muted-foreground">
                  Apply effect changes from other devices
                </div>
              </div>
              <Switch
                checked={syncFormData.recv?.fx ?? true}
                onCheckedChange={(checked) => handleSyncChange('recv.fx', checked)}
              />
            </div>
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Send on Direct Change</div>
                <div className="text-sm text-muted-foreground">
                  Broadcast when values change
                </div>
              </div>
              <Switch
                checked={syncFormData.send?.dir ?? true}
                onCheckedChange={(checked) => handleSyncChange('send.dir', checked)}
              />
            </div>
          </div>
        </ListItem>

        <ListItem>
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Send on Button Press</div>
                <div className="text-sm text-muted-foreground">
                  Broadcast when button is pressed
                </div>
              </div>
              <Switch
                checked={syncFormData.send?.btn ?? true}
                onCheckedChange={(checked) => handleSyncChange('send.btn', checked)}
              />
            </div>
          </div>
        </ListItem>

        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <div className="flex-1">
              <div className="font-medium">Sync Group</div>
              <div className="text-sm text-muted-foreground">
                Only sync with devices in the same group (1-255)
              </div>
            </div>
            <input
              type="number"
              min="1"
              max="255"
              value={syncFormData.recv?.grp ?? 1}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1
                handleSyncChange('recv.grp', val)
                handleSyncChange('send.grp', val)
              }}
              className="w-20 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-right"
            />
          </div>
        </ListItem>
      </ListSection>

      {/* MQTT */}
      <ListSection title="MQTT">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <MessageSquare className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Enable MQTT</div>
              <div className="text-sm text-muted-foreground">
                Connect to an MQTT broker for home automation
              </div>
            </div>
            <Switch
              checked={mqttFormData.en ?? false}
              onCheckedChange={(checked) => handleMqttChange('en', checked)}
            />
          </div>
        </ListItem>

        {mqttFormData.en && (
          <>
            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-broker">Broker Address</Label>
                <input
                  id="mqtt-broker"
                  type="text"
                  value={mqttFormData.broker ?? ''}
                  onChange={(e) => handleMqttChange('broker', e.target.value)}
                  placeholder="192.168.1.100 or mqtt.example.com"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-port">Port</Label>
                <input
                  id="mqtt-port"
                  type="number"
                  value={mqttFormData.port ?? 1883}
                  onChange={(e) => handleMqttChange('port', parseInt(e.target.value) || 1883)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-user">Username (optional)</Label>
                <input
                  id="mqtt-user"
                  type="text"
                  value={mqttFormData.user ?? ''}
                  onChange={(e) => handleMqttChange('user', e.target.value)}
                  placeholder="Leave blank for anonymous"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-password">Password</Label>
                <div className="relative">
                  <input
                    id="mqtt-password"
                    type={showMqttPassword ? 'text' : 'password'}
                    value={mqttFormData.psk ?? ''}
                    onChange={(e) => handleMqttChange('psk', e.target.value)}
                    placeholder={mqttFormData.pskl ? `Current: ${mqttFormData.pskl} characters` : 'Enter password'}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMqttPassword(!showMqttPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showMqttPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-client-id">Client ID</Label>
                <input
                  id="mqtt-client-id"
                  type="text"
                  value={mqttFormData.cid ?? ''}
                  onChange={(e) => handleMqttChange('cid', e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-device-topic">Device Topic</Label>
                <input
                  id="mqtt-device-topic"
                  type="text"
                  value={mqttFormData.topics?.device ?? 'wled/test'}
                  onChange={(e) => handleMqttChange('topics.device', e.target.value)}
                  placeholder="wled/devicename"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-2 py-2">
                <Label htmlFor="mqtt-group-topic">Group Topic</Label>
                <input
                  id="mqtt-group-topic"
                  type="text"
                  value={mqttFormData.topics?.group ?? 'wled/all'}
                  onChange={(e) => handleMqttChange('topics.group', e.target.value)}
                  placeholder="wled/all"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </ListItem>

            <ListItem>
              <div className="w-full space-y-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Retain Messages</div>
                    <div className="text-sm text-muted-foreground">
                      Broker retains last published state
                    </div>
                  </div>
                  <Switch
                    checked={mqttFormData.rtn ?? false}
                    onCheckedChange={(checked) => handleMqttChange('rtn', checked)}
                  />
                </div>
              </div>
            </ListItem>
          </>
        )}
      </ListSection>

      {/* Alexa / Voice Assistant */}
      <ListSection title="Voice Assistant">
        <ListItem>
          <div className="flex items-center gap-3 min-h-[48px] w-full">
            <Mic className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Alexa Emulation</div>
              <div className="text-sm text-muted-foreground">
                Allow Amazon Alexa to discover this device
              </div>
            </div>
            <Switch
              checked={alexaFormData.alexa ?? false}
              onCheckedChange={(checked) => handleAlexaChange('alexa', checked)}
            />
          </div>
        </ListItem>

        {alexaFormData.alexa && (
          <ListItem>
            <div className="w-full py-2">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Say "Alexa, discover devices" to find this WLED device.
                  Once discovered, you can control it by saying:
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

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-1">About Sync Settings</p>
          <p>
            UDP sync allows multiple WLED devices to synchronize effects, colors, and brightness.
            MQTT enables integration with home automation systems like Home Assistant.
            Alexa emulation allows voice control without any cloud connection.
          </p>
        </div>
      </div>
    </ScreenContainer>
  )
}
