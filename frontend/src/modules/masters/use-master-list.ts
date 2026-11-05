import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/shared/services/api.service';
import { useToast } from '@/shared/context/toast-context';
import { useDebounce } from '@/shared/hooks/use-debounce';
import type { ActiveFilter, MasterListQuery } from '@/shared/types/common.types';
import { invalidateLookups } from './use-lookups';

interface MasterRow {
  id: number;
  isActive: boolean;
}

interface MasterService<T, Q> {
  list: (query?: Q) => Promise<T[]>;
  setActive: (id: number, isActive: boolean) => Promise<unknown>;
}

/**
 * State for a master list screen: search, active filter, rows, loading and the activate/deactivate action.
 * `extra` adds screen-specific filters (e.g. productId for modules).
 */
export function useMasterList<T extends MasterRow, Q extends MasterListQuery = MasterListQuery>(
  service: MasterService<T, Q>,
  label: (row: T) => string,
  extra: Partial<Q> = {},
) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<ActiveFilter>('all');
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);
  const extraKey = JSON.stringify(extra);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = { search: debouncedSearch || undefined, active, ...JSON.parse(extraKey) } as Q;
      setRows(await service.list(query));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [service, debouncedSearch, active, extraKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const toggleActive = useCallback(
    async (row: T) => {
      try {
        await service.setActive(row.id, !row.isActive);
        invalidateLookups();
        toast.success(`${label(row)} ${row.isActive ? 'deactivated' : 'activated'}`);
        reload();
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [service, label, toast, reload],
  );

  const afterSave = useCallback(() => {
    invalidateLookups();
    reload();
  }, [reload]);

  return { rows, loading, error, search, setSearch, active, setActive, reload, toggleActive, afterSave };
}
