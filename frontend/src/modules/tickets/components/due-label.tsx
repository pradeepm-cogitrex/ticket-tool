import { AlarmClock, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import type { Ticket } from '../ticket.types';
import { SLA_COLORS, slaState } from '../ticket.util';

/** Compact "Due in 3h" / "Overdue 2h" label for lists. */
export function DueLabel({ ticket }: { ticket: Pick<Ticket, 'createdAt' | 'dueAt' | 'resolvedAt' | 'status'> }) {
  const sla = slaState(ticket);
  const Icon = sla.tone === 'met' ? CheckCircle2 : sla.tone === 'missed' ? XCircle : sla.tone === 'paused' ? PauseCircle : AlarmClock;
  return (
    <span className={`due due--${sla.tone}`} style={{ ['--c' as string]: SLA_COLORS[sla.tone] }} title={`Due ${new Date(ticket.dueAt).toLocaleString('en-IN')}`}>
      <Icon />
      {sla.label}
    </span>
  );
}
