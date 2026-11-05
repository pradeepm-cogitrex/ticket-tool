import { createCrudService } from '@/shared/services/crud.service';
import type { Product, ProductPayload } from './product.types';

export const productService = createCrudService<Product, ProductPayload>('/masters/products');
