import type { Ticket } from '@/modules/tickets/ticket.types';
import type { StatusType } from '@/modules/masters/status/status.types';

export type DashboardDays = 7 | 14 | 30 | 90;

/** a preset number of days up to today, or a custom from / to */
export type DashboardRange = DashboardDays | 'custom';

/** yyyy-mm-dd, both days included */
export interface CustomRange {
  from: string;
  to: string;
}

/** all = super admin (everything), team = admin (their client products), mine = employee (their own tickets) */
export type DashboardScope = 'all' | 'team' | 'mine';

export interface DashboardFilter {
  clientId?: number;
  productId?: number;
}

export interface DashboardSummary {
  days: number;
  /** yyyy-mm-dd, the window the range figures cover */
  from: string;
  to: string;
  custom: boolean;
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
