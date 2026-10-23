import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScrollHintContainerProps {
  children: React.ReactNode
  className?: string
}

/**
 * A scrolling area that fades out its bottom edge and shows a chevron while there is more
 * content below, so a list cut off at a row boundary doesn't look like it ends there.
 */
export function ScrollHintContainer({ children, className }: ScrollHintContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [hasMoreBelow, setHasMoreBelow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setHasMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    update()
    el.addEventListener('scroll', update, { passive: true })
    // The container (drawer opening) or its content can change size without a scroll
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(el)
    if (el.firstElementChild) observer?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div ref={ref} className="flex-1 overflow-auto">
        <div className={className}>{children}</div>
      </div>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-16 flex items-end justify-center pb-1',
          'bg-gradient-to-t from-background to-transparent transition-opacity duration-200',
          hasMoreBelow ? 'opacity-100' : 'opacity-0',
        )}
      >
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  )
}
