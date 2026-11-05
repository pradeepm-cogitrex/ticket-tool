import { useState } from 'react';
import { X } from 'lucide-react';
import type { Lookups } from '@/modules/masters/use-lookups';
import { Button } from '@/shared/components/button';
import type { BulkUpdatePayload } from '../ticket.types';

interface BulkActionBarProps {
  count: number;
  lookups: Lookups | null;
  busy: boolean;
  onApply: (changes: Omit<BulkUpdatePayload, 'ids'>) => void;
  onClear: () => void;
}

/** Floating bar shown while tickets are selected in the list. */
export function BulkActionBar({ count, lookups, busy, onApply, onClear }: BulkActionBarProps) {
  const [statusId, setStatusId] = useState('');
  const [priorityId, setPriorityId] = useState('');
  const [assignee, setAssignee] = useState('');

  const apply = () => {
    const changes: Omit<BulkUpdatePayload, 'ids'> = {};
    if (statusId) changes.statusId = Number(statusId);
    if (priorityId) changes.priorityId = Number(priorityId);
    if (assignee) changes.assignedToId = assignee === 'none' ? null : Number(assignee);
    onApply(changes);
  };

  const nothingChosen = !statusId && !priorityId && !assignee;

  return (
    <div className="bulk-bar" role="region" aria-label="Bulk actions">
      <span className="bulk-bar__count">
        <strong className="tabular">{count}</strong> selected
      </span>
      <select className="bulk-bar__select" aria-label="Set status" value={statusId} onChange={(e) => setStatusId(e.target.value)}>
        <option value="">Status…</option>
        {(lookups?.statuses ?? [])
          .filter((s) => s.isActive)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>
      <select className="bulk-bar__select" aria-label="Set priority" value={priorityId} onChange={(e) => setPriorityId(e.target.value)}>
        <option value="">Priority…</option>
        {(lookups?.priorities ?? [])
          .filter((p) => p.isActive)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
      <select className="bulk-bar__select" aria-label="Assign to" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        <option value="">Assign to…</option>
        <option value="none">Unassigned</option>
        {(lookups?.employees ?? [])
          .filter((a) => a.isActive)
          .map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
      </select>
      <Button size="sm" variant="primary" onClick={apply} disabled={nothingChosen} loading={busy}>
        Apply
      </Button>
      <button className="bulk-bar__close" onClick={onClear} aria-label="Clear selection">
        <X size={16} />
      </button>
    </div>
  );
}
