import { cn } from '@/lib/utils'

interface ScreenContainerProps {
  children: React.ReactNode
  className?: string
}

export function ScreenContainer({ children, className }: ScreenContainerProps) {
  return (
    <div className={cn('flex-1 overflow-auto', className)}>
      {children}
    </div>
  )
}
