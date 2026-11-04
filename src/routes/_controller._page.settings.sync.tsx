import { createFileRoute } from '@tanstack/react-router'
import { SyncScreen } from '@/components/sync/SyncScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/sync')({
  component: SyncRoute,
})

function SyncRoute() {
  return <SyncScreen onBack={useGoBack()} />
}
