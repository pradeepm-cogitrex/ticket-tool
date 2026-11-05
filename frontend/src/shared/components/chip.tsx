import { ReactNode } from 'react';
import { cn } from '../utils/cn.util';

interface ChipProps {
  color?: string;
  children: ReactNode;
  dot?: boolean;
  square?: boolean;
  size?: 'sm' | 'md';
  title?: string;
}

/** Coloured label for status, priority and flags. Colour comes from the master record. */
export function Chip({ color, children, dot = true, square, size = 'md', title }: ChipProps) {
  return (
    <span
      className={cn('chip', square && 'chip--square', size === 'sm' && 'chip--sm')}
      style={color ? { ['--c' as string]: color } : undefined}
      title={title}
    >
      {dot && <span className="chip__dot" />}
      {children}
    </span>
  );
}
