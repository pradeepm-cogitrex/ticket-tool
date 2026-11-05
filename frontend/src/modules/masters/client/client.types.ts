import type { BaseRecord } from '@/shared/types/common.types';

export interface Client extends BaseRecord {
  /** short code used in ticket numbers, e.g. SAKKU */
  code: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sortOrder: number;
  isActive: boolean;
  ticketCount?: number;
  /** products mapped to this client */
  productCount?: number;
}

export interface ClientPayload {
  code: string;
  name: string;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  sortOrder: number;
  isActive: boolean;
}
