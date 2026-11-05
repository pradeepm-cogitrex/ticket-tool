import type { BaseRecord, SortDir } from '@/shared/types/common.types';
import type { UserRole } from '@/modules/auth/auth.types';
import type { StatusType } from '@/modules/masters/status/status.types';

interface PersonRef {
  id: number;
  name: string;
  email?: string;
  role?: UserRole;
}

export type TicketSource = 'portal' | 'widget';

export interface Ticket extends BaseRecord {
  /** TKT-SAKKU-HRMS-11/26/00042 */
  ticketNo: string;
  /** null only on tickets raised before clients existed */
  clientId: number | null;
  client: { id: number; name: string; code: string } | null;
  productId: number;
  product: { id: number; name: string; code: string };
  moduleId: number | null;
  module: { id: number; name: string } | null;
  ticketTypeId: number | null;
  ticketType: { id: number; name: string; color: string } | null;
  /** employee who raised it, when picked from the Employee master */
  /** user contact (Masters › User Contacts) this ticket is about */
  contactId: number | null;
  contact: TicketContact | null;
  raisedById: number | null;
  raisedBy: PersonRef | null;
  username: string;
  email: string | null;
  phone: string | null;
  subject: string;
  description: string;
  priorityId: number;
  priority: { id: number; name: string; color: string; responseHrs: number; resolveHrs: number };
  /** SLA hours that applied: the client's agreed hours, or the Priority master hours */
  slaResponseHrs: number | null;
  slaResolveHrs: number | null;
  statusId: number;
  status: { id: number; name: string; color: string; type: StatusType; pausesSla: boolean; requiresNote: boolean; locksTicket: boolean };
  assignedToId: number | null;
  assignedTo: PersonRef | null;
  /** null when the ticket came from the HelpX widget */
  createdById: number | null;
  createdBy: PersonRef | null;
  source: TicketSource;
  sourceUrl: string | null;
  dueAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface TicketContact {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  phone: string | null;
}

export type NotificationChannel = 'email' | 'whatsapp';

/** A mail or WhatsApp message sent to a user contact about the ticket. */
export interface TicketNotification extends BaseRecord {
  contactId: number | null;
  recipientName: string;
  channel: NotificationChannel;
  recipient: string;
  subject: string;
  message: string;
  /** not_configured = saved, but credentials are not set so nothing went out */
  status: 'sent' | 'failed' | 'not_configured';
  error: string | null;
  sentBy: PersonRef | null;
}

export interface NotifyPayload {
  contactIds: number[];
  channels: NotificationChannel[];
  message: string;
}

export interface NotifyResult {
  sent: number;
  failed: number;
  notConfigured: number;
  skipped: string[];
  notifications: TicketNotification[];
}

export interface TicketReply extends BaseRecord {
  ticketId: number;
  authorId: number;
  author: PersonRef;
  body: string;
  isInternal: boolean;
}

export interface TicketAttachment extends BaseRecord {
  ticketId: number;
  replyId: number | null;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: PersonRef | null;
}

export type TicketHistoryAction = 'created' | 'updated' | 'replied' | 'noted' | 'attached' | 'notified';

export interface TicketHistory extends BaseRecord {
  action: TicketHistoryAction;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedBy: PersonRef | null;
}

export interface TicketDetail extends Ticket {
  replies: TicketReply[];
  attachments: TicketAttachment[];
  history: TicketHistory[];
  notifications: TicketNotification[];
  /** whether mail / WhatsApp credentials are set on the server */
  messaging: { email: boolean; whatsapp: boolean };
}

export type TicketSortField =
  | 'createdAt'
  | 'ticketNo'
  | 'dueAt'
  | 'priority'
  | 'status'
  | 'client'
  | 'product'
  | 'ticketType'
  | 'username'
  | 'subject'
  | 'assignee';

export interface TicketQuery {
  search?: string;
  clientIds?: string;
  productIds?: string;
  ticketTypeIds?: string;
  statusIds?: string;
  priorityIds?: string;
  assignee?: string;
  view?: 'open' | 'closed' | 'all';
  overdue?: 'true';
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: TicketSortField;
  sortDir?: SortDir;
}

export interface TicketCounts {
  all: number;
  open: number;
  closed: number;
  mine: number;
  unassigned: number;
  overdue: number;
}

export interface CreateTicketPayload {
  clientId: number;
  productId: number;
  moduleId: number | null;
  ticketTypeId: number;
  subject: string;
  description: string;
  priorityId: number;
  assignedToId: number | null;
}

export interface UpdateTicketPayload {
  clientId?: number;
  productId?: number;
  moduleId?: number | null;
  ticketTypeId?: number;
  username?: string;
  email?: string | null;
  phone?: string | null;
  subject?: string;
  priorityId?: number;
  statusId?: number;
  assignedToId?: number | null;
  contactId?: number | null;
  resolutionNote?: string | null;
}

export interface BulkUpdatePayload {
  ids: number[];
  statusId?: number;
  priorityId?: number;
  assignedToId?: number | null;
}

export interface BulkUpdateResult {
  updated: number;
  failed: { id: number; message: string }[];
}
