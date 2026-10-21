import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
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

  const removeController = useCallback((id: string) => {
    removeControllerFromStorage(id)
    notifyListeners()
  }, [])

  const updateController = useCallback(
    (id: string, updates: Partial<Pick<Controller, 'name' | 'url'>>) => {
      updateControllerInStorage(id, updates)
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

export function useSelectedController() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { controllers } = useControllers()

  const selectedController = selectedId
    ? controllers.find((c) => c.url === selectedId) || null
    : null

  return {
    selectedController,
    selectController: setSelectedId,
    clearSelection: () => setSelectedId(null),
  }
}
