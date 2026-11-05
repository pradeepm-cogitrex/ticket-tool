import { apiService } from '@/shared/services/api.service';
import type { Paginated } from '@/shared/types/common.types';
import type {
  BulkUpdatePayload,
  BulkUpdateResult,
  CreateTicketPayload,
  NotifyPayload,
  NotifyResult,
  Ticket,
  TicketAttachment,
  TicketCounts,
  TicketDetail,
  TicketQuery,
  TicketReply,
  UpdateTicketPayload,
} from './ticket.types';

const BASE = '/tickets';

export const ticketService = {
  list: (query: TicketQuery) => apiService.get<Paginated<Ticket>>(BASE, query),
  counts: () => apiService.get<TicketCounts>(`${BASE}/counts`),
  /** key = ticket number (TKT-2026-00012) or id */
  get: (key: string | number) => apiService.get<TicketDetail>(`${BASE}/${encodeURIComponent(String(key))}`),
  create: (payload: CreateTicketPayload) => apiService.post<TicketDetail>(BASE, payload),
  update: (id: number, payload: UpdateTicketPayload) => apiService.patch<TicketDetail>(`${BASE}/${id}`, payload),
  bulkUpdate: (payload: BulkUpdatePayload) => apiService.patch<BulkUpdateResult>(`${BASE}/bulk`, payload),

  /** inform user contacts by mail and / or WhatsApp */
  notify: (id: number, payload: NotifyPayload) => apiService.post<NotifyResult>(`${BASE}/${id}/notify`, payload),

  addReply: (id: number, body: string) => apiService.post<TicketReply>(`${BASE}/${id}/replies`, { body }),

  uploadAttachments: (id: number, files: File[], replyId?: number) =>
    apiService.upload<TicketAttachment[]>(`${BASE}/${id}/attachments`, files, replyId ? { replyId: String(replyId) } : {}),

  /** the file itself, typed with its stored mime type so images and PDFs render */
  attachmentBlob: (attachment: TicketAttachment) =>
    apiService
      .blob(`${BASE}/attachments/${attachment.id}/download`)
      .then((b) => new Blob([b], { type: attachment.mimeType || b.type })),

  downloadAttachment: (attachment: TicketAttachment) =>
    apiService.download(`${BASE}/attachments/${attachment.id}/download`, attachment.fileName),
};
