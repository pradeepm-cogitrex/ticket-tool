import { Brackets, SelectQueryBuilder } from 'typeorm';
import { ClientProductPair } from '../masters/employee/employee.repo';
import { Ticket } from './ticket.entity';

/**
 * Which tickets a user may see. null = everything (super admin).
 * Admins and employees see the tickets of the client products they are assigned to
 * (e.g. HRMS·Sakku and HRMS·Google), plus any ticket assigned to them, logged by them or raised by them.
 */
export interface TicketScope {
  userId: number;
  pairs: ClientProductPair[];
}

type ScopedTicket = Pick<Ticket, 'clientId' | 'productId' | 'assignedToId' | 'createdById' | 'raisedById'>;

export const inPairs = (pairs: ClientProductPair[], clientId: number | null, productId: number): boolean =>
  pairs.some((p) => p.clientId === clientId && p.productId === productId);

export function canSeeTicket(ticket: ScopedTicket, scope: TicketScope | null): boolean {
  if (!scope) return true;
  return (
    inPairs(scope.pairs, ticket.clientId, ticket.productId) ||
    ticket.assignedToId === scope.userId ||
    ticket.createdById === scope.userId ||
    ticket.raisedById === scope.userId
  );
}

/** Adds the scope to a TypeORM query on tickets (alias `t`). */
export function applyScope(qb: SelectQueryBuilder<Ticket>, scope: TicketScope | null): void {
  if (!scope) return;
  qb.andWhere(
    new Brackets((w) => {
      w.where('t.assignedToId = :scopeUser', { scopeUser: scope.userId })
        .orWhere('t.createdById = :scopeUser')
        .orWhere('t.raisedById = :scopeUser');
      scope.pairs.forEach((p, i) => {
        w.orWhere(`(t.clientId = :scopeC${i} AND t.productId = :scopeP${i})`, { [`scopeC${i}`]: p.clientId, [`scopeP${i}`]: p.productId });
      });
    }),
  );
}

/** "(alias.client_id = ? AND alias.product_id = ?) OR …" for raw SQL; '1 = 0' when there are no pairs. */
export function pairsSql(pairs: ClientProductPair[], clientCol: string, productCol: string): { sql: string; params: unknown[] } {
  if (!pairs.length) return { sql: '1 = 0', params: [] };
  return {
    sql: `(${pairs.map(() => `(${clientCol} = ? AND ${productCol} = ?)`).join(' OR ')})`,
    params: pairs.flatMap((p) => [p.clientId, p.productId]),
  };
}

/** The same rule for raw SQL: returns a condition and its parameters, e.g. `AND ${sql}`. */
export function scopeSql(scope: TicketScope | null, alias = 't'): { sql: string; params: unknown[] } {
  if (!scope) return { sql: '1 = 1', params: [] };
  const parts = [`${alias}.assigned_to_id = ?`, `${alias}.created_by_id = ?`, `${alias}.raised_by_id = ?`];
  const params: unknown[] = [scope.userId, scope.userId, scope.userId];
  if (scope.pairs.length) {
    const pairs = pairsSql(scope.pairs, `${alias}.client_id`, `${alias}.product_id`);
    parts.push(pairs.sql);
    params.push(...pairs.params);
  }
  return { sql: `(${parts.join(' OR ')})`, params };
}
