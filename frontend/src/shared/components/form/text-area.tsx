import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn.util';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} className={cn('textarea', invalid && 'input--error', className)} aria-invalid={invalid || undefined} {...rest} />;
});
