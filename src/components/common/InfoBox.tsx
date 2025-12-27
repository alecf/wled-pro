import { Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InfoBoxProps {
  variant?: 'info' | 'warning' | 'muted';
  title?: string;
  description: string | React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function InfoBox({
  variant = 'info',
  title,
  description,
  icon: CustomIcon,
  action,
  className,
}: InfoBoxProps) {
  // Determine default icon based on variant
  const DefaultIcon = variant === 'warning' ? AlertTriangle : Info;
  const Icon = CustomIcon || DefaultIcon;

  // Variant-specific styles
  const variantStyles = {
    info: 'bg-blue-500/10 border-l-4 border-blue-500',
    warning: 'bg-yellow-500/10 border border-yellow-500/20',
    muted: 'bg-muted/50 border border-border',
  };

  const iconStyles = {
    info: 'text-blue-500',
    warning: 'text-yellow-600 dark:text-yellow-500',
    muted: 'text-muted-foreground',
  };

  const textStyles = {
    info: 'text-blue-700 dark:text-blue-300',
    warning: 'text-yellow-800 dark:text-yellow-200',
    muted: 'text-foreground',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg',
        variantStyles[variant],
        className
      )}
    >
      <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', iconStyles[variant])} />
      <div className={cn('flex-1 text-sm', textStyles[variant])}>
        {title && <p className="font-medium mb-1">{title}</p>}
        {typeof description === 'string' ? <p>{description}</p> : description}
        {action && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
