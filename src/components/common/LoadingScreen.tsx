import { Loader2 } from "lucide-react";
import { ScreenContainer } from "@/components/layout";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  /** Optional loading message displayed below the spinner */
  message?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Full-screen loading indicator for async data loading states.
 *
 * Uses ScreenContainer for consistent layout and safe area handling.
 *
 * @example
 * ```tsx
 * if (isLoading) {
 *   return <LoadingScreen message="Loading presets..." />
 * }
 * ```
 */
export function LoadingScreen({ message, className }: LoadingScreenProps) {
  return (
    <ScreenContainer className={cn("p-4", className)}>
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        {message && (
          <p className="text-sm text-muted-foreground">{message}</p>
        )}
      </div>
    </ScreenContainer>
  );
}
