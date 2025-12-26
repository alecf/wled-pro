import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSafeAreaInsets } from "@/hooks/useSafeAreaInsets";

interface PageHeaderProps {
  /** Page title displayed prominently */
  title: string;
  /** Optional subtitle displayed below title in smaller text */
  subtitle?: string;
  /** Back button handler. If not provided, no back button is shown */
  onBack?: () => void;
  /** Optional action buttons displayed on the right side */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standard page header with title, optional subtitle, back button, and actions.
 *
 * Handles safe-area-inset-top for mobile devices with notches.
 * Use this for full-page screens that need a back button.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Edit Light Show"
 *   subtitle="Living Room"
 *   onBack={() => navigate(-1)}
 *   actions={<Button>Save</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  actions,
  className,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b",
        className
      )}
      style={{ paddingTop: insets.top }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="-ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {subtitle ? (
            <div className="ml-2">
              <h1 className="text-lg font-semibold leading-tight">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          ) : (
            <h1 className={cn("text-lg font-semibold", onBack && "ml-2")}>
              {title}
            </h1>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
