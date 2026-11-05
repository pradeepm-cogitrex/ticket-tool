import { createCrudService } from '@/shared/services/crud.service';
import type { ModuleMaster, ModulePayload, ModuleQuery } from './module.types';

export const moduleService = createCrudService<ModuleMaster, ModulePayload, ModuleQuery>('/masters/modules');
