import type { BaseRecord } from '@/shared/types/common.types';

export interface Product extends BaseRecord {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  ticketCount?: number;
  /** employees working on this product, for any client */
  employeeCount?: number;
  /** clients this product is mapped to */
  clientCount?: number;
}

export interface ProductPayload {
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}
