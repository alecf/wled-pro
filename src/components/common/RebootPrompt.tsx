import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRebootDevice } from '@/hooks/useWled'
import { toast } from 'sonner'

interface RebootPromptProps {
  baseUrl: string
  /** Whether there are unsaved changes that need to be saved before reboot */
  hasChanges: boolean
  /** Called before reboot to save changes */
  onSaveBeforeReboot?: () => Promise<void>
  /** Optional message to display */
  message?: string
}

/**
 * Displays a warning banner when settings changes require a device reboot.
 * Provides "Save" and "Save & Reboot" buttons.
 */
export function RebootPrompt({
  baseUrl,
  hasChanges,
  onSaveBeforeReboot,
  message = 'Some changes require a device reboot to take effect.',
}: RebootPromptProps) {
  const reboot = useRebootDevice(baseUrl)
  const [rebootState, setRebootState] = useState<'idle' | 'rebooting' | 'reconnecting' | 'success'>('idle')
  const [reconnectTimer, setReconnectTimer] = useState(0)

  // Handle reconnection polling after reboot
  useEffect(() => {
    if (rebootState !== 'reconnecting') return

    // Check for timeout - use a separate timeout to avoid synchronous setState
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    if (reconnectTimer >= 15) {
      timeoutId = setTimeout(() => {
        toast.error('Device did not reconnect. Please check the connection manually.')
        setRebootState('idle')
      }, 0)
      return () => {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    const checkConnection = async () => {
      try {
        const response = await fetch(`${baseUrl}/json/info`, { method: 'GET' })
        if (response.ok) {
          setRebootState('success')
          toast.success('Device reconnected successfully')
          // Reset after showing success
          setTimeout(() => setRebootState('idle'), 2000)
        }
      } catch {
        // Device not yet available, continue polling
        setReconnectTimer((t) => t + 1)
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(checkConnection, 2000)
    return () => clearInterval(interval)
  }, [rebootState, reconnectTimer, baseUrl])

  const handleSaveAndReboot = async () => {
    try {
      // Save changes first if callback provided
      if (onSaveBeforeReboot) {
        await onSaveBeforeReboot()
      }

      setRebootState('rebooting')
      await reboot.mutateAsync()
      toast.success('Device rebooting...')

      // Wait a moment before starting to poll for reconnection
      setTimeout(() => {
        setRebootState('reconnecting')
        setReconnectTimer(0)
      }, 3000)
    } catch (error) {
      toast.error('Failed to reboot device')
      setRebootState('idle')
      console.error(error)
    }
  }

  if (!hasChanges) return null

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
      <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-500">Reboot Recommended</p>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
      <Button
        onClick={handleSaveAndReboot}
        variant="outline"
        size="sm"
        className="border-yellow-500/20"
        disabled={rebootState !== 'idle'}
      >
        {rebootState === 'rebooting' && (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Rebooting...
          </>
        )}
        {rebootState === 'reconnecting' && (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Reconnecting...
          </>
        )}
        {rebootState === 'success' && (
          <>
            <Check className="h-4 w-4 mr-2" />
            Connected
          </>
        )}
        {rebootState === 'idle' && (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Save & Reboot
          </>
        )}
      </Button>
    </div>
  )
}
