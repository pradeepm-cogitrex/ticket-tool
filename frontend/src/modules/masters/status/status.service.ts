import { createCrudService } from '@/shared/services/crud.service';
import type { Status, StatusPayload } from './status.types';

export const statusService = createCrudService<Status, StatusPayload>('/masters/statuses');
