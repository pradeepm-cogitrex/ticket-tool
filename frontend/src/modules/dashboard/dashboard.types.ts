import type { Ticket } from '@/modules/tickets/ticket.types';
import type { StatusType } from '@/modules/masters/status/status.types';

export type DashboardRange = 7 | 14 | 30 | 90;

/** all = super admin (everything), team = admin (their client products), mine = employee (their own tickets) */
export type DashboardScope = 'all' | 'team' | 'mine';

export interface DashboardFilter {
  clientId?: number;
  productId?: number;
}

export interface DashboardSummary {
  days: DashboardRange;
  scope: DashboardScope;
  totals: {
    open: number;
    mine: number;
    unassigned: number;
    overdue: number;
    createdToday: number;
    resolvedToday: number;
    createdInRange: number;
    resolvedInRange: number;
    /** % of tickets resolved in range that met their due date; null when none resolved */
    slaCompliance: number | null;
    avgResolutionHrs: number | null;
  };
  byStatus: { id: number; name: string; color: string; type: StatusType; count: number }[];
  byClientProduct: {
    id: number;
    client: { id: number; name: string; code: string };
    product: { id: number; name: string; code: string };
    total: number;
    open: number;
    overdue: number;
  }[];
  byPriority: { id: number; name: string; color: string; count: number }[];
  trend: { date: string; created: number; resolved: number }[];
  employeeLoad: { id: number; name: string; open: number }[];
  recent: Ticket[];
}
