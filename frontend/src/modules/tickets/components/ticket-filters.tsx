import { useEffect, useState } from 'react';
import { CalendarRange, FilterX } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { clientsOf, myClientProducts, productsOf, type Lookups } from '@/modules/masters/use-lookups';
import { Button } from '@/shared/components/button';
import { MultiSelect } from '@/shared/components/form/multi-select';
import { SelectInput } from '@/shared/components/form/select-input';
import { SearchBox } from '@/shared/components/search-box';
import { useDebounce } from '@/shared/hooks/use-debounce';

export interface TicketFilterValues {
  search: string;
  clientIds: number[];
  productIds: number[];
  ticketTypeIds: number[];
  statusIds: number[];
  priorityIds: number[];
  assignee: string;
  from: string;
  to: string;
}

interface TicketFiltersProps {
  values: TicketFilterValues;
  lookups: Lookups | null;
  /** hide the assignee filter when the tab already decides it (Mine, Unassigned) */
  showAssignee: boolean;
  onChange: (patch: Partial<TicketFilterValues>) => void;
  onClear: () => void;
}

export function TicketFilters({ values, lookups, showAssignee, onChange, onClear }: TicketFiltersProps) {
  const { user } = useAuth();
  // admins and employees only filter by their own client products; products follow the chosen clients
  const pairs = myClientProducts(lookups, user);
  const clientOptions = clientsOf(pairs);
  const productOptions = productsOf(values.clientIds.length ? pairs.filter((cp) => values.clientIds.includes(cp.clientId)) : pairs);
  const [search, setSearch] = useState(values.search);
  const debounced = useDebounce(search, 350);

  useEffect(() => {
    if (debounced !== values.search) onChange({ search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    setSearch(values.search);
  }, [values.search]);

  const hasFilters =
    !!values.search ||
    values.clientIds.length > 0 ||
    values.productIds.length > 0 ||
    values.ticketTypeIds.length > 0 ||
    values.statusIds.length > 0 ||
    values.priorityIds.length > 0 ||
    !!values.assignee ||
    !!values.from ||
    !!values.to;

  return (
    <div className="toolbar ticket-filters">
      <SearchBox
        id="ticket-search"
        className="toolbar__search"
        value={search}
        onChange={setSearch}
        placeholder="Search ticket no, client, username, subject"
      />
      {clientOptions.length > 1 && (
        <MultiSelect
          compact
          label="Client"
          value={values.clientIds}
          onChange={(clientIds) => onChange({ clientIds })}
          options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
        />
      )}
      <MultiSelect
        compact
        label="Product"
        value={values.productIds}
        onChange={(productIds) => onChange({ productIds })}
        options={productOptions.map((p) => ({ value: p.id, label: p.name }))}
      />
      <MultiSelect
        compact
        label="Type"
        value={values.ticketTypeIds}
        onChange={(ticketTypeIds) => onChange({ ticketTypeIds })}
        options={(lookups?.ticketTypes ?? []).map((t) => ({ value: t.id, label: t.name, color: t.color }))}
      />
      <MultiSelect
        compact
        label="Status"
        value={values.statusIds}
        onChange={(statusIds) => onChange({ statusIds })}
        options={(lookups?.statuses ?? []).map((s) => ({ value: s.id, label: s.name, color: s.color }))}
      />
      <MultiSelect
        compact
        label="Priority"
        value={values.priorityIds}
        onChange={(priorityIds) => onChange({ priorityIds })}
        options={(lookups?.priorities ?? []).map((p) => ({ value: p.id, label: p.name, color: p.color }))}
      />
      {showAssignee && (
        <SelectInput
          className="master-filter"
          aria-label="Assigned to"
          placeholder="Anyone"
          value={values.assignee}
          onChange={(e) => onChange({ assignee: e.target.value })}
          options={[
            { value: 'me', label: 'Assigned to me' },
            { value: 'unassigned', label: 'Unassigned' },
            ...(lookups?.employees ?? []).filter((a) => a.isActive).map((a) => ({ value: String(a.id), label: a.name })),
          ]}
        />
      )}
      <div className="date-range" title="Created between">
        <CalendarRange />
        <input type="date" className="date-range__input" aria-label="Created from" value={values.from} max={values.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
        <span>–</span>
        <input type="date" className="date-range__input" aria-label="Created to" value={values.to} min={values.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
      </div>
      {hasFilters && (
        <Button
          size="sm"
          variant="ghost"
          icon={<FilterX />}
          onClick={() => {
            setSearch('');
            onClear();
          }}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
