import type { BaseRecord } from '@/shared/types/common.types';

export type StatusType = 'open' | 'closed';

export interface Status extends BaseRecord {
  name: string;
  type: StatusType;
  pausesSla: boolean;
  requiresNote: boolean;
  /** final status: the ticket becomes read-only */
  locksTicket: boolean;
  isDefault: boolean;
  color: string;
  sortOrder: number;
  isActive: boolean;
  ticketCount?: number;
}

export interface StatusPayload {
  name: string;
  type: StatusType;
  pausesSla: boolean;
  requiresNote: boolean;
  locksTicket: boolean;
  isDefault: boolean;
  color: string;
  sortOrder: number;
  isActive: boolean;
}
