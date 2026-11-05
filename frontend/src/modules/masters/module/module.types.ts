import type { BaseRecord, MasterListQuery } from '@/shared/types/common.types';

export interface ModuleMaster extends BaseRecord {
  productId: number;
  product?: { id: number; name: string; code: string };
  name: string;
  description: string | null;
  isActive: boolean;
  ticketCount?: number;
}

export interface ModulePayload {
  productId: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ModuleQuery extends MasterListQuery {
  productId?: number;
}
