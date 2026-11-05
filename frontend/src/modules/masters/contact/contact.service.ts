import { createCrudService } from '@/shared/services/crud.service';
import type { Contact, ContactPayload, ContactQuery } from './contact.types';

export const contactService = createCrudService<Contact, ContactPayload, ContactQuery>('/masters/contacts');
