import { useState, useCallback, useSyncExternalStore } from 'react'
import type { Controller } from '@/types/controller'
import {
  getControllers,
  addController as addControllerToStorage,
  removeController as removeControllerFromStorage,
  updateController as updateControllerInStorage,
} from '@/lib/controllers'

const listeners = new Set<() => void>()

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function getSnapshot() {
  return JSON.stringify(getControllers())
}

export function useControllers() {
  const controllersJson = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const controllers: Controller[] = JSON.parse(controllersJson)

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
    []
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
    ? controllers.find((c) => c.id === selectedId) || null
    : null

  return {
    selectedController,
    selectController: setSelectedId,
    clearSelection: () => setSelectedId(null),
  }
}
