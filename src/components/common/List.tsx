import { cn } from '@/lib/utils'

interface ListProps {
  children: React.ReactNode
  className?: string
}

export function List({ children, className }: ListProps) {
  return <div className={cn('bg-list-bg -mx-4', className)}>{children}</div>
}

interface ListItemProps {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  className?: string
}

/**
 * A row in a List. With `onClick` it acts as a button (focusable, Enter/Space activate it).
 * It stays a div rather than a <button> because rows may contain their own controls
 * (e.g. a Switch), which can't be nested inside a button.
 */
export function ListItem({ children, onClick, active, className }: ListItemProps) {
  const interactiveProps = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          // Ignore keys bubbling up from nested controls
          if (e.target !== e.currentTarget) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        },
      }
    : {}

  return (
    <div
      className={cn(
        'border-b border-list-divider px-4 py-3',
        'bg-list-item-bg',
        'transition-colors',
        onClick && 'cursor-pointer active:bg-list-item-bg-hover',
        active && 'bg-list-item-bg-active',
        className,
      )}
      {...interactiveProps}
    >
      {children}
    </div>
  )
}

interface ListSectionProps {
  title?: string
  /** Optional control shown at the right of the section title (e.g. a Scan button) */
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function ListSection({ title, action, children, className }: ListSectionProps) {
  return (
    <div className={cn('mb-6', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 mb-2">
          {title && (
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <List>{children}</List>
    </div>
  )
}
