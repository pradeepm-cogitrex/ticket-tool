import { Injectable } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { EmployeeRepo } from '../masters/employee/employee.repo';
import { TicketRepo } from '../tickets/ticket.repo';
import { pairsSql, scopeSql, TicketScope } from '../tickets/ticket-scope';

type Row = Record<string, string | number | null>;
const num = (v: string | number | null | undefined): number => Number(v ?? 0);

const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * all  = super admin: every client and product
 * team = admin: every ticket of the client products they are assigned to
 * mine = employee: tickets assigned to, raised by or logged by them
 */
export type DashboardScope = 'all' | 'team' | 'mine';

export interface DashboardFilter {
  clientId?: number;
  productId?: number;
}

/** A condition plus its parameters, joined with AND. */
const and = (...parts: { sql: string; params: unknown[] }[]) => ({
  sql: parts.map((p) => p.sql).join(' AND '),
  params: parts.flatMap((p) => p.params),
});

@Injectable()
export class DashboardService {
  constructor(
    private readonly ticketRepo: TicketRepo,
    private readonly employeeRepo: EmployeeRepo,
  ) {}

  async summary(user: AuthUser, days: number, filter: DashboardFilter) {
    const m = this.ticketRepo.manager;
    const back = days - 1; // window includes today

    const kind: DashboardScope = user.role === Role.SuperAdmin ? 'all' : user.role === Role.Admin ? 'team' : 'mine';
    const pairs = kind === 'all' ? [] : await this.employeeRepo.pairsOf(user.id);
    // which tickets count: everything, the admin's client products (plus their own), or only the employee's own
    const scope: TicketScope | null = kind === 'all' ? null : { userId: user.id, pairs: kind === 'team' ? pairs : [] };

    // the Client / Product dropdowns on the dashboard
    const narrow = (alias: string) => ({
      sql: [filter.clientId ? `${alias}.client_id = ?` : '1 = 1', filter.productId ? `${alias}.product_id = ?` : '1 = 1'].join(' AND '),
      params: [filter.clientId, filter.productId].filter((v) => v !== undefined),
    });
    const vis = and(scopeSql(scope), narrow('t')); // condition on tickets alias t

    // client products listed in "By client · product": all for a super admin, otherwise the user's own
    const cpVisible = and(kind === 'all' ? { sql: '1 = 1', params: [] } : pairsSql(pairs, 'cp.client_id', 'cp.product_id'), narrow('cp'));

    // whose workload is shown: everyone (super admin), the admin's team, or just the employee
    const eaNarrow = narrow('ea');
    const teamPairs = pairsSql(pairs, 'ea.client_id', 'ea.product_id');
    const people =
      kind === 'all'
        ? filter.clientId || filter.productId
          ? { sql: `a.id IN (SELECT ea.employee_id FROM employee_assignments ea WHERE ${eaNarrow.sql})`, params: eaNarrow.params }
          : { sql: '1 = 1', params: [] }
        : kind === 'team'
          ? {
              sql: `(a.id = ? OR a.id IN (SELECT ea.employee_id FROM employee_assignments ea WHERE ${teamPairs.sql} AND ${eaNarrow.sql}))`,
              params: [user.id, ...teamPairs.params, ...eaNarrow.params],
            }
          : { sql: 'a.id = ?', params: [user.id] };

    const [totalsRows, byStatus, byClientProduct, byPriority, createdTrend, resolvedTrend, employeeLoad, recent] =
      await Promise.all([
        m.query(
          `SELECT
             COALESCE(SUM(s.type = 'open'), 0) AS openCount,
             COALESCE(SUM(s.type = 'open' AND t.assigned_to_id = ?), 0) AS mine,
             COALESCE(SUM(s.type = 'open' AND t.assigned_to_id IS NULL), 0) AS unassigned,
             COALESCE(SUM(s.type = 'open' AND s.pauses_sla = 0 AND t.due_at < NOW()), 0) AS overdue,
             COALESCE(SUM(t.created_at >= CURDATE()), 0) AS createdToday,
             COALESCE(SUM(t.resolved_at >= CURDATE()), 0) AS resolvedToday,
             COALESCE(SUM(t.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)), 0) AS createdInRange,
             COALESCE(SUM(t.resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)), 0) AS resolvedInRange,
             COALESCE(SUM(t.resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND t.resolved_at <= t.due_at), 0) AS resolvedOnTime,
             AVG(CASE WHEN t.resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                      THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.resolved_at) END) AS avgResolutionMins
           FROM tickets t
           JOIN statuses s ON s.id = t.status_id
          WHERE ${vis.sql}`,
          [user.id, back, back, back, back, ...vis.params],
        ) as Promise<Row[]>,
        m.query(
          `SELECT s.id, s.name, s.color, s.type, COUNT(t.id) AS total
             FROM statuses s
             LEFT JOIN tickets t ON t.status_id = s.id AND ${vis.sql}
            WHERE s.is_active = 1
            GROUP BY s.id
            ORDER BY s.sort_order, s.name`,
          vis.params,
        ) as Promise<Row[]>,
        m.query(
          `SELECT cp.id, c.id AS clientId, c.name AS clientName, c.code AS clientCode,
                  p.id AS productId, p.name AS productName, p.code AS productCode,
                  COUNT(t.id) AS total,
                  COALESCE(SUM(s.type = 'open'), 0) AS openCount,
                  COALESCE(SUM(s.type = 'open' AND s.pauses_sla = 0 AND t.due_at < NOW()), 0) AS overdueCount
             FROM client_products cp
             JOIN clients c ON c.id = cp.client_id
             JOIN products p ON p.id = cp.product_id
             LEFT JOIN tickets t ON t.client_id = cp.client_id AND t.product_id = cp.product_id
                  AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND ${vis.sql}
             LEFT JOIN statuses s ON s.id = t.status_id
            WHERE cp.is_active = 1 AND c.is_active = 1 AND p.is_active = 1 AND ${cpVisible.sql}
            GROUP BY cp.id
            ORDER BY total DESC, c.sort_order, c.name, p.sort_order`,
          [back, ...vis.params, ...cpVisible.params],
        ) as Promise<Row[]>,
        m.query(
          `SELECT pr.id, pr.name, pr.color, COUNT(t.id) AS total
             FROM priorities pr
             LEFT JOIN tickets t ON t.priority_id = pr.id
                  AND t.status_id IN (SELECT id FROM statuses WHERE type = 'open')
                  AND ${vis.sql}
            WHERE pr.is_active = 1
            GROUP BY pr.id
            ORDER BY pr.sort_order`,
          vis.params,
        ) as Promise<Row[]>,
        m.query(
          `SELECT DATE_FORMAT(t.created_at, '%Y-%m-%d') AS day, COUNT(*) AS total
             FROM tickets t
            WHERE t.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND ${vis.sql}
            GROUP BY day`,
          [back, ...vis.params],
        ) as Promise<Row[]>,
        m.query(
          `SELECT DATE_FORMAT(t.resolved_at, '%Y-%m-%d') AS day, COUNT(*) AS total
             FROM tickets t
            WHERE t.resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND ${vis.sql}
            GROUP BY day`,
          [back, ...vis.params],
        ) as Promise<Row[]>,
        m.query(
          `SELECT a.id, a.name, COUNT(t.id) AS total
             FROM employees a
             LEFT JOIN tickets t ON t.assigned_to_id = a.id
                  AND t.status_id IN (SELECT id FROM statuses WHERE type = 'open')
                  AND ${vis.sql}
            WHERE a.is_active = 1 AND a.role <> 'super_admin' AND ${people.sql}
            GROUP BY a.id
            ORDER BY total DESC, a.name
            LIMIT 6`,
          [...vis.params, ...people.params],
        ) as Promise<Row[]>,
        this.ticketRepo.recent(8, scope, filter),
      ]);

    const t = totalsRows[0] ?? {};
    const resolvedInRange = num(t.resolvedInRange);

    // one point per day, including days with no tickets
    const created = new Map(createdTrend.map((r) => [String(r.day), num(r.total)]));
    const resolved = new Map(resolvedTrend.map((r) => [String(r.day), num(r.total)]));
    const trend = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - back + i);
      const key = dateKey(d);
      return { date: key, created: created.get(key) ?? 0, resolved: resolved.get(key) ?? 0 };
    });

    return {
      days,
      scope: kind,
      filter: { clientId: filter.clientId ?? null, productId: filter.productId ?? null },
      totals: {
        open: num(t.openCount),
        mine: num(t.mine),
        unassigned: num(t.unassigned),
        overdue: num(t.overdue),
        createdToday: num(t.createdToday),
        resolvedToday: num(t.resolvedToday),
        createdInRange: num(t.createdInRange),
        resolvedInRange,
        slaCompliance: resolvedInRange ? Math.round((num(t.resolvedOnTime) / resolvedInRange) * 100) : null,
        avgResolutionHrs: t.avgResolutionMins == null ? null : Math.round((num(t.avgResolutionMins) / 60) * 10) / 10,
      },
      byStatus: byStatus.map((r) => ({ id: num(r.id), name: r.name, color: r.color, type: r.type, count: num(r.total) })),
      byClientProduct: byClientProduct.map((r) => ({
        id: num(r.id),
        client: { id: num(r.clientId), name: r.clientName, code: r.clientCode },
        product: { id: num(r.productId), name: r.productName, code: r.productCode },
        total: num(r.total),
        open: num(r.openCount),
        overdue: num(r.overdueCount),
      })),
      byPriority: byPriority.map((r) => ({ id: num(r.id), name: r.name, color: r.color, count: num(r.total) })),
      trend,
      employeeLoad: employeeLoad.map((r) => ({ id: num(r.id), name: r.name, open: num(r.total) })),
      recent,
    };
  }
}
