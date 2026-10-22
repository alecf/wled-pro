import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ListItem } from './List'

interface ListItemWithIconProps {
  icon?: React.ComponentType<{ className?: string }>
  /** Classes for the icon (default: muted foreground) */
  iconClassName?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  onClick?: () => void
  active?: boolean
  /** Right-side content (e.g. a Switch). Defaults to a chevron; pass null for nothing. */
  rightElement?: React.ReactNode
  className?: string
}

export function ListItemWithIcon({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  onClick,
  active,
  rightElement = <ChevronRight className="h-5 w-5 text-muted-foreground" />,
  className,
}: ListItemWithIconProps) {
  return (
    <ListItem onClick={onClick} active={active} className={className}>
      <div className="flex items-center gap-3 min-h-[48px]">
        {Icon && <Icon className={cn('h-5 w-5 shrink-0 text-muted-foreground', iconClassName)} />}
        <div className="flex-1 min-w-0">
          <div className="font-medium">{title}</div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
        {rightElement}
      </div>
    </ListItem>
  )
}
