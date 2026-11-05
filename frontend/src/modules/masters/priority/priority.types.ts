import type { BaseRecord } from '@/shared/types/common.types';

export interface Priority extends BaseRecord {
  name: string;
  responseHrs: number;
  resolveHrs: number;
  /** employee role priority that takes this level of ticket (1 = most senior) */
  assignRolePriority: number;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  ticketCount?: number;
}

export interface PriorityPayload {
  name: string;
  responseHrs: number;
  resolveHrs: number;
  assignRolePriority: number;
  color: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}
