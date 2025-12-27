import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </div>
  );
}
