import { cn } from '../utils/cn.util';
import { hueFor, initials } from '../utils/format.util';

interface AvatarProps {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  fallback?: string;
}

export function Avatar({ name, size = 'md', showName, fallback = 'Unassigned' }: AvatarProps) {
  const avatar = (
    <span
      className={cn('avatar', size !== 'md' && `avatar--${size}`)}
      style={{ ['--h' as string]: name ? hueFor(name) : 160 }}
      title={name ?? fallback}
      aria-hidden={showName || undefined}
    >
      {name ? initials(name) : '–'}
    </span>
  );
  if (!showName) return avatar;
  return (
    <span className="avatar-name">
      {avatar}
      <span className={name ? undefined : 'muted'}>{name ?? fallback}</span>
    </span>
  );
}
