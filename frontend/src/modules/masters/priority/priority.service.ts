import { createCrudService } from '@/shared/services/crud.service';
import type { Priority, PriorityPayload } from './priority.types';

export const priorityService = createCrudService<Priority, PriorityPayload>('/masters/priorities');
