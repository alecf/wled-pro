import { useState } from 'react'
import { useControllers } from '@/hooks/useControllers'
import { HomeScreen } from '@/components/HomeScreen'
import { ControllerView } from '@/components/ControllerView'

function App() {
  const [selectedControllerId, setSelectedControllerId] = useState<string | null>(null)
  const { controllers } = useControllers()

  const selectedController = selectedControllerId
    ? controllers.find((c) => c.id === selectedControllerId)
    : null

  if (selectedController) {
    return (
      <ControllerView
        controller={selectedController}
        onBack={() => setSelectedControllerId(null)}
      />
    )
  }

  return <HomeScreen onSelectController={setSelectedControllerId} />
}

export default App
