import { useControllers } from '@/hooks/useControllers'
import { AddControllerDialog } from '@/components/AddControllerDialog'
import { ControllerCard } from '@/components/ControllerCard'
import { Lightbulb } from 'lucide-react'

interface HomeScreenProps {
  onSelectController: (id: string) => void
}

export function HomeScreen({ onSelectController }: HomeScreenProps) {
  const { controllers, addController, removeController } = useControllers()

  const handleAddController = (controller: { url: string; name?: string }) => {
    addController(controller.url, controller.name)
  }

  if (controllers.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Lightbulb className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Welcome to WLED Pro</h1>
            <p className="text-muted-foreground">
              Control your WLED devices with a beautiful, modern interface. Add your
              first controller to get started.
            </p>
          </div>
          <AddControllerDialog onAdd={handleAddController} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">WLED Pro</h1>
          </div>
          <AddControllerDialog onAdd={handleAddController} />
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {controllers.map((controller) => (
            <ControllerCard
              key={controller.id}
              controller={controller}
              onClick={() => onSelectController(controller.id)}
              onRemove={() => removeController(controller.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
