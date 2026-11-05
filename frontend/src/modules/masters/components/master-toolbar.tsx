import { ReactNode } from 'react';
import { SearchBox } from '@/shared/components/search-box';
import { Segmented } from '@/shared/components/segmented';
import type { ActiveFilter } from '@/shared/types/common.types';
import { plural } from '@/shared/utils/format.util';

interface MasterToolbarProps {
  search: string;
  onSearch: (value: string) => void;
  active: ActiveFilter;
  onActive: (value: ActiveFilter) => void;
  count: number;
  noun: string;
  placeholder?: string;
  children?: ReactNode;
}

/** Search + Active/Inactive filter row on top of every master table. */
export function MasterToolbar({ search, onSearch, active, onActive, count, noun, placeholder, children }: MasterToolbarProps) {
  return (
    <div className="toolbar">
      <SearchBox className="toolbar__search" value={search} onChange={onSearch} placeholder={placeholder ?? `Search ${noun}s`} />
      {children}
      <Segmented<ActiveFilter>
        ariaLabel="Filter by active"
        value={active}
        onChange={onActive}
        options={[
          { value: 'all', label: 'All' },
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Inactive' },
        ]}
      />
      <div className="toolbar__spacer" />
      <span className="muted tabular" style={{ fontSize: 13, fontWeight: 600 }}>
        {plural(count, noun)}
      </span>
    </div>
  );
}
