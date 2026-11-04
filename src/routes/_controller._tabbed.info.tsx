import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DeviceInfoScreen } from '@/components/info/DeviceInfoScreen'
import { useControllerContext } from '@/contexts/ControllerContext'

export const Route = createFileRoute('/_controller/_tabbed/info')({
  component: InfoComponent,
})

function InfoComponent() {
  const { info, refresh, isRefreshing } = useControllerContext()
  // WebSocket messages only refresh info when the state changes; read it fresh on open
  useEffect(() => {
    refresh()
  }, [refresh])
  return <DeviceInfoScreen info={info} onRefresh={refresh} isRefreshing={isRefreshing} />
}
