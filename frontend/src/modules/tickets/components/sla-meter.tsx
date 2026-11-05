import { formatDateTime } from '@/shared/utils/date.util';
import type { Ticket } from '../ticket.types';
import { SLA_COLORS, slaState } from '../ticket.util';

/** SLA card on the ticket detail: progress bar plus response and resolution targets. */
export function SlaMeter({ ticket }: { ticket: Ticket }) {
  const sla = slaState(ticket);
  const responseDue = new Date(new Date(ticket.createdAt).getTime() + (ticket.slaResponseHrs ?? ticket.priority.responseHrs) * 3_600_000);
  const responded = ticket.firstResponseAt ? new Date(ticket.firstResponseAt) : null;
  const responseMet = responded ? responded <= responseDue : Date.now() <= responseDue.getTime();

  return (
    <div className="sla-meter" style={{ ['--c' as string]: SLA_COLORS[sla.tone] }}>
      <div className="sla-meter__top">
        <span className="sla-meter__label">{sla.label}</span>
        <span className="sla-meter__pct tabular">{Math.round(sla.used * 100)}%</span>
      </div>
      <div className="sla-meter__track" role="progressbar" aria-valuenow={Math.round(sla.used * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="sla-meter__fill" style={{ width: `${Math.max(sla.used * 100, 3)}%` }} />
      </div>
      <dl className="kv">
        <dt>First response</dt>
        <dd>
          {responded ? (
            <span style={{ color: responseMet ? 'var(--success)' : 'var(--danger)' }}>{formatDateTime(responded)}</span>
          ) : (
            <span style={{ color: responseMet ? undefined : 'var(--danger)' }}>by {formatDateTime(responseDue)}</span>
          )}
        </dd>
        <dt>Resolve by</dt>
        <dd>{formatDateTime(ticket.dueAt)}</dd>
        {ticket.resolvedAt && (
          <>
            <dt>Resolved on</dt>
            <dd>{formatDateTime(ticket.resolvedAt)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
