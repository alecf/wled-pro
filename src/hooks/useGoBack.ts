import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'

/**
 * Back for a settings screen: return to the screen it was opened from, or to the Shows tab
 * when it was opened directly (a reload or a shared link).
 */
export function useGoBack() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  return useCallback(() => {
    if (canGoBack) router.history.back()
    else router.navigate({ to: '/shows' })
  }, [router, canGoBack])
}
