import { Pencil, Power, PowerOff } from 'lucide-react';
import { Button } from '@/shared/components/button';

interface RowActionsProps {
  isActive: boolean;
  onEdit: () => void;
  onToggle: () => void;
  canEdit: boolean;
}

/** Edit + Activate/Deactivate buttons at the end of each master row. */
export function RowActions({ isActive, onEdit, onToggle, canEdit }: RowActionsProps) {
  if (!canEdit) return null;
  return (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} onClick={onEdit} aria-label="Edit" title="Edit" />
      <Button
        size="sm"
        variant="ghost"
        iconOnly
        icon={isActive ? <PowerOff /> : <Power />}
        onClick={onToggle}
        aria-label={isActive ? 'Deactivate' : 'Activate'}
        title={isActive ? 'Deactivate' : 'Activate'}
      />
    </div>
  );
}

export function ActiveChip({ isActive }: { isActive: boolean }) {
  return (
    <span className="chip" style={{ ['--c' as string]: isActive ? 'var(--success)' : 'var(--faint)' }}>
      <span className="chip__dot" />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
