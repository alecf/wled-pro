import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error: Error) {
      console.log('SW registration error', error)
    },
  })

  // Force update on mount if there's an old service worker that might be blocking navigation
  useEffect(() => {
    const forceUpdate = async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          // Force update check
          await registration.update()
        }
      }
    }
    forceUpdate()
  }, [])

  const insets = useSafeAreaInsets()

  if (!needRefresh) {
    return null
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg"
      style={{ paddingBottom: insets.bottom }}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">New version available</p>
          <p className="text-xs text-muted-foreground">
            Reload to get the latest features and fixes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => updateServiceWorker(true)}
          >
            Reload
          </Button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="p-1 rounded-md hover:bg-accent"
            aria-label="Dismiss update notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
