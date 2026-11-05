import { createCrudService } from '@/shared/services/crud.service';
import type { Client, ClientPayload } from './client.types';

export const clientService = createCrudService<Client, ClientPayload>('/masters/clients');
