import { createFileRoute } from '@tanstack/react-router'
import { LedHardwareScreen } from '@/components/led-hardware/LedHardwareScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/led-hardware')({
  component: LedHardwareRoute,
})

function LedHardwareRoute() {
  return <LedHardwareScreen onBack={useGoBack()} />
}
