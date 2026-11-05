import { ArrowRight, BellRing, MessageSquare, Lock, Paperclip, PencilLine, Sparkles } from 'lucide-react';
import { formatDateTime, timeAgo } from '@/shared/utils/date.util';
import type { TicketDetail, TicketHistory as HistoryEntry } from '../ticket.types';

const ICONS = {
  created: Sparkles,
  updated: PencilLine,
  replied: MessageSquare,
  noted: Lock,
  attached: Paperclip,
  notified: BellRing,
} as const;

/** A field's value when the ticket was created: the "from" of its first change, otherwise today's value. */
function originalValue(items: HistoryEntry[], field: string, current: string | null | undefined) {
  const first = items
    .filter((h) => h.action === 'updated' && h.field === field)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
  return first ? first.oldValue : (current ?? null);
}

function describe(h: HistoryEntry) {
  switch (h.action) {
    case 'replied':
      return <>replied</>;
    case 'noted':
      return <>added an internal note</>;
    case 'attached':
      return (
        <>
          attached <strong>{h.newValue}</strong>
        </>
      );
    case 'notified':
      return (
        <>
          informed <strong>{h.newValue}</strong>
        </>
      );
    default:
      return (
        <>
          changed <strong>{h.field}</strong>
          <span className="history__change">
            <span className="history__old">{h.oldValue ?? 'empty'}</span>
            <ArrowRight size={12} />
            <span className="history__new">{h.newValue ?? 'empty'}</span>
          </span>
        </>
      );
  }
}

/** Audit trail of every change, newest first. */
export function TicketHistory({ ticket }: { ticket: TicketDetail }) {
  const items = ticket.history;
  if (!items.length) return <p className="muted" style={{ padding: 20 }}>No changes yet.</p>;

  // the user who raised it (widget tickets have no employee behind them)
  const raiser = ticket.createdBy?.name ?? originalValue(items, 'Username', ticket.username) ?? 'Unknown user';
  const createdWith = [
    originalValue(items, 'Client', ticket.client?.name),
    originalValue(items, 'Product', ticket.product?.name),
    originalValue(items, 'Ticket type', ticket.ticketType?.name),
    originalValue(items, 'Priority', ticket.priority?.name),
  ].filter(Boolean) as string[];

  return (
    <ol className="history">
      {items.map((h) => {
        const Icon = ICONS[h.action] ?? PencilLine;
        const who = h.changedBy?.name ?? ticket.username;
        return (
          <li key={h.id} className={`history__item history__item--${h.action}`}>
            <span className="history__icon">
              <Icon />
            </span>
            <div className="history__text">
              {h.action === 'created' ? (
                <>
                  <strong>{raiser}</strong>
                  {!ticket.createdBy && ticket.email && <span className="history__muted"> ({ticket.email})</span>} created the ticket
                  {createdWith.map((v) => (
                    <span key={v} className="history__tag">
                      {v}
                    </span>
                  ))}
                </>
              ) : (
                <>
                  <strong>{who}</strong> {describe(h)}
                </>
              )}
              <time title={timeAgo(h.createdAt)}>
                {formatDateTime(h.createdAt)} · {timeAgo(h.createdAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
