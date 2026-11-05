import { createCrudService } from '@/shared/services/crud.service';
import type { ClientProduct, ClientProductPayload, ClientProductQuery } from './client-product.types';

export const clientProductService = createCrudService<ClientProduct, ClientProductPayload, ClientProductQuery>(
  '/masters/client-products',
);
