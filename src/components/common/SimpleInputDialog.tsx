import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SimpleInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fieldLabel: string;
  placeholder?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  inputType?: 'text' | 'url' | 'number';
  required?: boolean;
}

export function SimpleInputDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldLabel,
  placeholder,
  defaultValue = '',
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  inputType = 'text',
  required = true,
}: SimpleInputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset value when dialog opens/closes or defaultValue changes
  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmedValue = value.trim();
    if (required && !trimmedValue) return;

    setIsSubmitting(true);
    try {
      await onSubmit(trimmedValue);
      setValue('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const isValid = !required || value.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="input-field">{fieldLabel}</Label>
            <Input
              id="input-field"
              type={inputType}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
