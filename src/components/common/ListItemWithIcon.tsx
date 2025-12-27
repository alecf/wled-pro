import { ChevronRight } from 'lucide-react';
import { ListItem } from './List';

interface ListItemWithIconProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  active?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function ListItemWithIcon({
  icon: Icon,
  title,
  subtitle,
  onClick,
  active,
  rightElement,
  className,
}: ListItemWithIconProps) {
  // Default to ChevronRight if no custom rightElement provided and not active
  const defaultRightElement = <ChevronRight className="h-5 w-5 text-muted-foreground" />;
  const finalRightElement = rightElement !== undefined ? rightElement : defaultRightElement;

  return (
    <ListItem onClick={onClick} active={active} className={className}>
      <div className="flex items-center gap-3 min-h-[48px]">
        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium">{title}</div>
          {subtitle && (
            <div className="text-sm text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {finalRightElement}
      </div>
    </ListItem>
  );
}
