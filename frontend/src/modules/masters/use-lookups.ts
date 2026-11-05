import { useCallback, useEffect, useState } from 'react';
import type { SessionUser } from '@/modules/auth/auth.types';
import { clientProductService } from './client-product/client-product.service';
import type { ClientProduct } from './client-product/client-product.types';
import { clientService } from './client/client.service';
import type { Client } from './client/client.types';
import { employeeService } from './employee/employee.service';
import type { Employee } from './employee/employee.types';
import { moduleService } from './module/module.service';
import type { ModuleMaster } from './module/module.types';
import { priorityService } from './priority/priority.service';
import type { Priority } from './priority/priority.types';
import { productService } from './product/product.service';
import type { Product } from './product/product.types';
import { statusService } from './status/status.service';
import type { Status } from './status/status.types';
import { ticketTypeService } from './ticket-type/ticket-type.service';
import type { TicketType } from './ticket-type/ticket-type.types';

/** Every master list, loaded once and shared by dropdowns across the app. Includes inactive rows; filter with isActive. */
export interface Lookups {
  clients: Client[];
  products: Product[];
  clientProducts: ClientProduct[];
  modules: ModuleMaster[];
  ticketTypes: TicketType[];
  priorities: Priority[];
  statuses: Status[];
  employees: Employee[];
}

const TTL_MS = 60_000;
let cache: { data: Lookups; at: number } | null = null;
let inflight: Promise<Lookups> | null = null;

/** Call after saving a master so the next dropdown shows the change. */
export const invalidateLookups = () => {
  cache = null;
};

export function loadLookups(force = false): Promise<Lookups> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return Promise.resolve(cache.data);
  if (inflight) return inflight;
  inflight = Promise.all([
    clientService.list({ active: 'all' }),
    productService.list({ active: 'all' }),
    clientProductService.list({ active: 'all' }),
    moduleService.list({ active: 'all' }),
    ticketTypeService.list({ active: 'all' }),
    priorityService.list({ active: 'all' }),
    statusService.list({ active: 'all' }),
    employeeService.list({ active: 'all' }),
  ])
    .then(([clients, products, clientProducts, modules, ticketTypes, priorities, statuses, employees]) => {
      const data = { clients, products, clientProducts, modules, ticketTypes, priorities, statuses, employees };
      cache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useLookups() {
  const [lookups, setLookups] = useState<Lookups | null>(cache?.data ?? null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback((force = false) => {
    setError(null);
    return loadLookups(force)
      .then(setLookups)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { lookups, error, reload };
}

/**
 * The active client products a user works on: all of them for a super admin,
 * otherwise the ones they are assigned to (an unassigned admin or employee gets every one, as before).
 */
export function myClientProducts(lookups: Lookups | null, user: SessionUser | null): ClientProduct[] {
  const usable = (lookups?.clientProducts ?? []).filter((cp) => cp.isActive && cp.client.isActive && cp.product.isActive);
  if (!user || user.role === 'super_admin') return usable;
  const mine = lookups?.employees.find((e) => e.id === user.id)?.assignments ?? [];
  if (!mine.length) return usable;
  return usable.filter((cp) => mine.some((a) => a.clientId === cp.clientId && a.productId === cp.productId));
}

/** Unique clients / products from a list of client products, in master order. */
export function clientsOf(pairs: ClientProduct[]) {
  const seen = new Map<number, ClientProduct['client']>();
  pairs.forEach((cp) => seen.set(cp.clientId, cp.client));
  return [...seen.values()];
}

export function productsOf(pairs: ClientProduct[]) {
  const seen = new Map<number, ClientProduct['product']>();
  pairs.forEach((cp) => seen.set(cp.productId, cp.product));
  return [...seen.values()];
}
