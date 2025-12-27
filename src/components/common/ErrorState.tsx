import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[50vh] text-center px-4',
        className
      )}
    >
      <p className="text-destructive mb-2 font-medium">{title}</p>
      {message && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          {message}
        </p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
