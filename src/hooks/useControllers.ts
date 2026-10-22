import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  addController as addControllerToStorage,
  getControllers,
  getLastController,
  removeController as removeControllerFromStorage,
  setLastController,
  updateController as updateControllerInStorage,
} from '@/lib/controllers'
import type { Controller } from '@/types/controller'

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notifyListeners() {
  for (const listener of listeners) listener()
}

function getSnapshot() {
  return JSON.stringify({ controllers: getControllers(), selectedUrl: getLastController() })
}

/**
 * Saved controllers and the selected (last opened) controller, both kept in
 * localStorage. Changes made through this hook re-render every user.
 */
export function useControllers() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  // Memoize the parsed value so we don't create new object references on every render
  const { controllers, selectedUrl } = useMemo(
    () => JSON.parse(snapshot) as { controllers: Controller[]; selectedUrl: string | null },
    [snapshot],
  )

  /** Select a controller by URL, or clear the selection with null */
  const selectController = useCallback((url: string | null) => {
    setLastController(url)
    notifyListeners()
  }, [])

  const addController = useCallback((url: string, name?: string) => {
    const controller = addControllerToStorage(url, name)
    notifyListeners()
    return controller
  }, [])

  const removeController = useCallback((url: string) => {
    removeControllerFromStorage(url)
    notifyListeners()
  }, [])

  const updateController = useCallback(
    (url: string, updates: Partial<Pick<Controller, 'name'>>) => {
      updateControllerInStorage(url, updates)
      notifyListeners()
    },
    [],
  )

  return {
    controllers,
    selectedUrl,
    selectController,
    addController,
    removeController,
    updateController,
  }
}
