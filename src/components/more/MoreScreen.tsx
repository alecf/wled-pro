import { ScreenContainer } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import {
  ChevronRight,
  MonitorSmartphone,
  Settings,
  Info,
  ExternalLink,
} from 'lucide-react'

interface MoreScreenProps {
  onSwitchController: () => void
}

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  description?: string
  onClick?: () => void
  external?: boolean
}

function MenuItem({ icon, label, description, onClick, external }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
    >
      <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{label}</div>
        {description && (
          <div className="text-sm text-muted-foreground truncate">
            {description}
          </div>
        )}
      </div>
      {external ? (
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  )
}

export function MoreScreen({ onSwitchController }: MoreScreenProps) {
  return (
    <ScreenContainer className="p-4 space-y-4">
      <Card>
        <CardContent className="p-2">
          <MenuItem
            icon={<MonitorSmartphone className="h-5 w-5" />}
            label="Switch Controller"
            description="Change to a different WLED device"
            onClick={onSwitchController}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2">
          <MenuItem
            icon={<Settings className="h-5 w-5" />}
            label="WLED Settings"
            description="Open native WLED configuration"
          />
          <MenuItem
            icon={<Settings className="h-5 w-5" />}
            label="App Settings"
            description="Configure WLED Pro preferences"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-2">
          <MenuItem
            icon={<Info className="h-5 w-5" />}
            label="About WLED Pro"
          />
        </CardContent>
      </Card>
    </ScreenContainer>
  )
}
