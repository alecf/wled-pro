import { useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  addController as addControllerToStorage,
  getControllers,
  removeController as removeControllerFromStorage,
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
  return JSON.stringify(getControllers())
}

export function useControllers() {
  const controllersJson = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  // Memoize the parsed array so we don't create new object references on every render
  const controllers: Controller[] = useMemo(() => JSON.parse(controllersJson), [controllersJson])

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
    addController,
    removeController,
    updateController,
  }
}
