import { cn } from '@/lib/utils'

interface ListProps {
  children: React.ReactNode
  className?: string
}

export function List({ children, className }: ListProps) {
  return (
    <div className={cn('bg-[var(--color-list-bg)] -mx-4', className)}>
      {children}
    </div>
  )
}

interface ListItemProps {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
}

export function ListItem({ children, onClick, active, className }: ListItemProps) {
  return (
    <div
      className={cn(
        'border-b border-[var(--color-list-divider)] px-4 py-3',
        'bg-[var(--color-list-item-bg)]',
        'transition-colors',
        onClick && 'cursor-pointer active:bg-[var(--color-list-item-bg-hover)]',
        active && 'bg-[var(--color-list-item-bg-active)]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

interface ListSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function ListSection({ title, children, className }: ListSectionProps) {
  return (
    <div className={cn('mb-6', className)}>
      {title && (
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-2">
          {title}
        </h2>
      )}
      <List>{children}</List>
    </div>
  )
}
