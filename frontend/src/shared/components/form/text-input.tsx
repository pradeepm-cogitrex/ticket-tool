import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn.util';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  invalid?: boolean;
  onClear?: () => void;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { icon, invalid, onClear, className, value, ...rest },
  ref,
) {
  const input = (
    <input ref={ref} className={cn('input', invalid && 'input--error', className)} value={value} aria-invalid={invalid || undefined} {...rest} />
  );
  if (!icon && !onClear) return input;
  return (
    <div className="input-wrap">
      {icon}
      {input}
      {onClear && value ? (
        <button type="button" className="input-wrap__clear" onClick={onClear} aria-label="Clear">
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
});
