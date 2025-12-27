import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSafeAreaInsets } from '@/hooks/useSafeAreaInsets';

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  className?: string;
}

interface ActionButtonBarProps {
  buttons: ActionButton[];
  className?: string;
}

export function ActionButtonBar({ buttons, className }: ActionButtonBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <footer
      className={cn('sticky bottom-0 border-t bg-background p-4', className)}
      style={{ paddingBottom: `calc(1rem + ${insets.bottom})` }}
    >
      <div className="flex gap-2">
        {buttons.map((button, index) => {
          const Icon = button.icon;
          return (
            <Button
              key={index}
              variant={button.variant || 'default'}
              onClick={button.onClick}
              disabled={button.disabled}
              className={cn('flex-1', button.className)}
            >
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {button.label}
            </Button>
          );
        })}
      </div>
    </footer>
  );
}
