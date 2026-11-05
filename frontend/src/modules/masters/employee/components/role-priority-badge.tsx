interface RolePriorityBadgeProps {
  level: number;
  title?: string;
}

/** "P1" badge; level 1 is the strongest colour, higher levels fade. */
export function RolePriorityBadge({ level, title }: RolePriorityBadgeProps) {
  return (
    <span className={`rp rp--${Math.min(level, 4)}`} title={title ?? `Role priority ${level}`}>
      P{level}
    </span>
  );
}
