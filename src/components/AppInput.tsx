import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  /** Latin content (email / password): type left-to-right */
  ltr?: boolean;
  /** Leading icon inside the field */
  icon?: LucideIcon;
  /** Trailing element (e.g. show/hide password button), rendered on the opposite side of the icon */
  trailing?: ReactNode;
}

export default function AppInput({ label, error, ltr, icon: Icon, trailing, className, ...props }: Props) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {Icon && (
          <Icon
            className={cn(
              'pointer-events-none absolute top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground',
              ltr ? 'left-3' : 'right-3',
            )}
            aria-hidden="true"
          />
        )}
        <Input
          id={id}
          dir={ltr ? 'ltr' : undefined}
          className={cn(ltr ? 'text-left' : undefined, Icon && (ltr ? 'pl-10' : 'pr-10'), trailing && (ltr ? 'pr-11' : 'pl-11'), className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...props}
        />
        {trailing && (
          <div className={cn('absolute top-1/2 -translate-y-1/2', ltr ? 'right-2' : 'left-2')}>{trailing}</div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
