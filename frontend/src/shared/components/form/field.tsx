import { ReactNode } from 'react';
import { cn } from '../../utils/cn.util';

interface FieldProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, used around every form input. */
export function Field({ label, htmlFor, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('field', className)}>
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="field__req">*</span>}
      </label>
      {children}
      {error ? <span className="field__error">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  );
}
