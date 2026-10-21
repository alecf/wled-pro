import { AlertCircle, Check, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getWledApi } from '@/api/wled'
import { ConfirmationDialog } from '@/components/common/ConfirmationDialog'
import { Button } from '@/components/ui/button'
import { useRebootDevice } from '@/hooks/useWled'

const INITIAL_DELAY_MS = 3000
const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 15
const SUCCESS_DISPLAY_MS = 2000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Rejects if `promise` has not settled within `ms` (a fetch to a rebooting device can hang). */
const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
  Promise.race([
    promise,
    sleep(ms).then(() => {
      throw new Error('Timed out')
    }),
  ])

interface RebootPromptProps {
  baseUrl: string
  /** Whether to show the banner (e.g. there are changes that need a reboot) */
  show: boolean
  /** Called before reboot, e.g. to save pending changes; if it throws, the reboot is skipped */
  onSaveBeforeReboot?: () => Promise<void>
  /** Called once the device is back online after the reboot */
  onReconnected?: () => void
  title?: string
  message?: string
  /** Button label; defaults to "Save & Reboot" with onSaveBeforeReboot, else "Reboot Now" */
  buttonLabel?: string
  /** If set, ask for confirmation with this text before rebooting */
  confirmMessage?: string
}

/**
 * Warning banner for settings that need a device reboot. Its button (optionally saves, then)
 * reboots the device and polls until it is back online.
 */
export function RebootPrompt({
  baseUrl,
  show,
  onSaveBeforeReboot,
  onReconnected,
  title = 'Reboot Recommended',
  message = 'Some changes require a device reboot to take effect.',
  buttonLabel = onSaveBeforeReboot ? 'Save & Reboot' : 'Reboot Now',
  confirmMessage,
}: RebootPromptProps) {
  const reboot = useRebootDevice(baseUrl)
  const [rebootState, setRebootState] = useState<
    'idle' | 'saving' | 'rebooting' | 'reconnecting' | 'success'
  >('idle')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  /** Polls /json/info until the device answers with a fresh uptime, or gives up. */
  const waitForReconnect = async (rebootRequestedAt: number) => {
    const api = getWledApi(baseUrl)
    await sleep(INITIAL_DELAY_MS)
    for (let poll = 0; poll < MAX_POLLS && !unmountedRef.current; poll++) {
      try {
        const info = await withTimeout(api.getInfo(), POLL_INTERVAL_MS)
        // A device that has not gone down yet still reports its old (longer) uptime.
        const secondsSinceReboot = (Date.now() - rebootRequestedAt) / 1000
        if (typeof info.uptime !== 'number' || info.uptime <= secondsSinceReboot + 2) {
          return true
        }
      } catch {
        // Device not reachable yet; keep polling
      }
      await sleep(POLL_INTERVAL_MS)
    }
    return false
  }

  const handleReboot = async () => {
    try {
      if (onSaveBeforeReboot) {
        // Leave idle first so the button is disabled (and the banner stays up) while saving
        setRebootState('saving')
        await onSaveBeforeReboot()
      }

      setRebootState('rebooting')
      const rebootRequestedAt = Date.now()
      await reboot.mutateAsync()
      toast.success('Device rebooting...')
      setRebootState('reconnecting')

      const reconnected = await waitForReconnect(rebootRequestedAt)
      if (unmountedRef.current) return

      if (!reconnected) {
        toast.error('Device did not reconnect. Please check the connection manually.')
        setRebootState('idle')
        return
      }

      toast.success('Device reconnected successfully')
      setRebootState('success')
      onReconnected?.()
      await sleep(SUCCESS_DISPLAY_MS)
      if (!unmountedRef.current) setRebootState('idle')
    } catch (error) {
      toast.error(onSaveBeforeReboot ? 'Failed to save and reboot' : 'Failed to reboot device')
      setRebootState('idle')
      console.error(error)
    }
  }

  // Stay visible while a reboot is in flight, even if saving cleared `show`
  if (!show && rebootState === 'idle') return null

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
      <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-500">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </div>
      <Button
        onClick={confirmMessage ? () => setConfirmOpen(true) : handleReboot}
        variant="outline"
        size="sm"
        className="border-yellow-500/20"
        disabled={rebootState !== 'idle'}
      >
        {rebootState === 'success' ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <RefreshCw
            className={rebootState === 'idle' ? 'h-4 w-4 mr-2' : 'h-4 w-4 mr-2 animate-spin'}
          />
        )}
        {rebootState === 'idle' && buttonLabel}
        {rebootState === 'saving' && 'Saving...'}
        {rebootState === 'rebooting' && 'Rebooting...'}
        {rebootState === 'reconnecting' && 'Reconnecting...'}
        {rebootState === 'success' && 'Connected'}
      </Button>

      {confirmMessage && (
        <ConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`${buttonLabel}?`}
          description={confirmMessage}
          confirmLabel={buttonLabel}
          onConfirm={() => {
            void handleReboot()
          }}
        />
      )}
    </div>
  )
}
