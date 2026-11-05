import type { BaseRecord, MasterListQuery } from '@/shared/types/common.types';

/** SLA hours agreed with the client for one ticket priority. */
export interface ClientProductSla {
  id?: number;
  priorityId: number;
  responseHrs: number;
  resolveHrs: number;
}

/** A product sold to a client, e.g. HRMS for Sakku. */
export interface ClientProduct extends BaseRecord {
  clientId: number;
  client: { id: number; code: string; name: string; isActive: boolean };
  productId: number;
  product: { id: number; code: string; name: string; isActive: boolean };
  /** key used by the HelpX widget script (appClientId) */
  clientKey: string | null;
  slas: ClientProductSla[];
  isActive: boolean;
  ticketCount?: number;
  employeeCount?: number;
}

export interface ClientProductPayload {
  clientId: number;
  productId: number;
  /** only priorities that differ from the Priority master */
  slas: ClientProductSla[];
  isActive: boolean;
}

export interface ClientProductQuery extends MasterListQuery {
  clientId?: number;
  productId?: number;
}

/** "Sakku · HRMS" */
export const pairLabel = (cp: { client?: { name: string } | null; product?: { name: string } | null }) =>
  [cp.client?.name, cp.product?.name].filter(Boolean).join(' · ');
