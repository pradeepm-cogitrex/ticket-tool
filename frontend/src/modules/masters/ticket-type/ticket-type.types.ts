import type { BaseRecord } from '@/shared/types/common.types';

/** Incident, Change Request, Blocker… */
export interface TicketType extends BaseRecord {
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  ticketCount?: number;
}

export interface TicketTypePayload {
  name: string;
  description: string | null;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}
