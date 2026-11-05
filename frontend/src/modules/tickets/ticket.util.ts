import { formatDuration } from '@/shared/utils/date.util';
import type { Ticket } from './ticket.types';

export type SlaTone = 'ok' | 'warn' | 'overdue' | 'paused' | 'met' | 'missed';

export interface SlaState {
  tone: SlaTone;
  label: string;
  /** share of the SLA window used, 0..1 (capped) */
  used: number;
}

/** Where a ticket stands against its due date. */
export function slaState(ticket: Pick<Ticket, 'createdAt' | 'dueAt' | 'resolvedAt' | 'status'>, now = Date.now()): SlaState {
  const created = new Date(ticket.createdAt).getTime();
  const due = new Date(ticket.dueAt).getTime();
  const window = Math.max(due - created, 1);

  if (ticket.status.type === 'closed') {
    const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : now;
    const met = resolved <= due;
    return {
      tone: met ? 'met' : 'missed',
      label: met ? `Met · ${formatDuration(resolved - created)}` : `Missed by ${formatDuration(resolved - due)}`,
      used: Math.min((resolved - created) / window, 1),
    };
  }

  const used = Math.min(Math.max((now - created) / window, 0), 1);
  if (ticket.status.pausesSla) return { tone: 'paused', label: 'SLA paused', used };

  const left = due - now;
  if (left < 0) return { tone: 'overdue', label: `Overdue ${formatDuration(left)}`, used: 1 };
  return { tone: used > 0.75 ? 'warn' : 'ok', label: `Due in ${formatDuration(left)}`, used };
}

export const SLA_COLORS: Record<SlaTone, string> = {
  ok: 'var(--success)',
  warn: 'var(--warning)',
  overdue: 'var(--danger)',
  paused: 'var(--muted)',
  met: 'var(--success)',
  missed: 'var(--danger)',
};

/** Ticket numbers of the current list, so the detail page can offer Previous / Next. */
const NAV_KEY = 'td.ticketNav';

export const rememberTicketNav = (ticketNos: string[]) => {
  try {
    sessionStorage.setItem(NAV_KEY, JSON.stringify(ticketNos));
  } catch {
    /* ignore */
  }
};

export const ticketNeighbours = (ticketNo: string): { prev?: string; next?: string } => {
  try {
    const list: string[] = JSON.parse(sessionStorage.getItem(NAV_KEY) ?? '[]');
    const i = list.indexOf(ticketNo);
    if (i < 0) return {};
    return { prev: list[i - 1], next: list[i + 1] };
  } catch {
    return {};
  }
};
