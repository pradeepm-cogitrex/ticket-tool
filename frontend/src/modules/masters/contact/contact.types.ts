import type { BaseRecord, MasterListQuery } from '@/shared/types/common.types';

/** A person at a client who uses one of our products. Informed by mail / WhatsApp about their tickets. */
export interface Contact extends BaseRecord {
  clientId: number;
  client: { id: number; code: string; name: string };
  productId: number;
  product: { id: number; code: string; name: string };
  name: string;
  /** login name in the product; tickets raised with it are linked to this contact */
  username: string | null;
  email: string | null;
  /** WhatsApp number with country code */
  phone: string | null;
  isActive: boolean;
  ticketCount?: number;
}

export interface ContactPayload {
  clientId: number;
  productId: number;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface ContactQuery extends MasterListQuery {
  clientId?: number;
  productId?: number;
}
