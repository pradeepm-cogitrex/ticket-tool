import { createCrudService } from '@/shared/services/crud.service';
import type { TicketType, TicketTypePayload } from './ticket-type.types';

export const ticketTypeService = createCrudService<TicketType, TicketTypePayload>('/masters/ticket-types');
