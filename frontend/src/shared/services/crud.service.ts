import { apiService } from './api.service';
import type { MasterListQuery } from '../types/common.types';

/**
 * Standard list / get / create / update / activate calls for a master endpoint.
 * Each master module builds its service from this, e.g. createCrudService<Product, ProductPayload>('/masters/products').
 */
export function createCrudService<T, Payload, Query extends object = MasterListQuery>(baseUrl: string) {
  return {
    list: (query?: Query) => apiService.get<T[]>(baseUrl, query),
    get: (id: number) => apiService.get<T>(`${baseUrl}/${id}`),
    create: (data: Payload) => apiService.post<T>(baseUrl, data),
    update: (id: number, data: Partial<Payload>) => apiService.patch<T>(`${baseUrl}/${id}`, data),
    setActive: (id: number, isActive: boolean) => apiService.patch<T>(`${baseUrl}/${id}/active`, { isActive }),
  };
}

export type CrudService<T, Payload> = ReturnType<typeof createCrudService<T, Payload>>;
