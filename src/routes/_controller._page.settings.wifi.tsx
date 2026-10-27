import { createFileRoute } from '@tanstack/react-router'
import { WifiScreen } from '@/components/wifi/WifiScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/wifi')({
  component: WifiRoute,
})

function WifiRoute() {
  return <WifiScreen onBack={useGoBack()} />
}
