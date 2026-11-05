import { ArrowRight, BellRing, MessageSquare, Lock, Paperclip, PencilLine, Sparkles } from 'lucide-react';
import { formatDateTime, timeAgo } from '@/shared/utils/date.util';
import type { TicketHistory as HistoryEntry } from '../ticket.types';

const ICONS = {
  created: Sparkles,
  updated: PencilLine,
  replied: MessageSquare,
  noted: Lock,
  attached: Paperclip,
  notified: BellRing,
} as const;

function describe(h: HistoryEntry) {
  switch (h.action) {
    case 'created':
      return <>created the ticket</>;
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
export function TicketHistory({ items }: { items: HistoryEntry[] }) {
  if (!items.length) return <p className="muted" style={{ padding: 20 }}>No changes yet.</p>;
  return (
    <ol className="history">
      {items.map((h) => {
        const Icon = ICONS[h.action] ?? PencilLine;
        return (
          <li key={h.id} className={`history__item history__item--${h.action}`}>
            <span className="history__icon">
              <Icon />
            </span>
            <div className="history__text">
              <strong>{h.changedBy?.name ?? 'HelpX widget'}</strong> {describe(h)}
              <time title={formatDateTime(h.createdAt)}>{timeAgo(h.createdAt)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
