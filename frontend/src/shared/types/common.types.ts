export type ActiveFilter = 'true' | 'false' | 'all';

export interface MasterListQuery {
  search?: string;
  active?: ActiveFilter;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Fields every database row has. */
export interface BaseRecord {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface NamedRef {
  id: number;
  name: string;
}

export type SortDir = 'ASC' | 'DESC';
