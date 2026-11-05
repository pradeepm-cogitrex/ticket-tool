import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, RefreshCw, Ticket as TicketIcon, TicketCheck } from 'lucide-react';
import { useLookups } from '@/modules/masters/use-lookups';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { Pagination } from '@/shared/components/pagination';
import { TabItem, Tabs } from '@/shared/components/tabs';
import { useToast } from '@/shared/context/toast-context';
import { errorMessage } from '@/shared/services/api.service';
import type { SortDir } from '@/shared/types/common.types';
import { downloadCsv } from '@/shared/utils/csv.util';
import { formatDate, formatDateTime, timeAgo } from '@/shared/utils/date.util';
import { BulkActionBar } from './components/bulk-action-bar';
import { DueLabel } from './components/due-label';
import { TicketFilters, TicketFilterValues } from './components/ticket-filters';
import { ticketService } from './ticket.service';
import type { BulkUpdatePayload, Ticket, TicketCounts, TicketQuery, TicketSortField } from './ticket.types';
import { rememberTicketNav, slaState } from './ticket.util';
import './tickets.css';

type TabKey = 'open' | 'mine' | 'unassigned' | 'overdue' | 'closed' | 'all';

const TAB_QUERY: Record<TabKey, Partial<TicketQuery>> = {
  open: { view: 'open' },
  mine: { view: 'open', assignee: 'me' },
  unassigned: { view: 'open', assignee: 'unassigned' },
  overdue: { overdue: 'true' },
  closed: { view: 'closed' },
  all: {},
};

const ids = (value: string | null) => (value ? value.split(',').map(Number).filter(Boolean) : []);

export default function TicketList() {
  const navigate = useNavigate();
  const toast = useToast();
  const { lookups } = useLookups();
  const [params, setParams] = useSearchParams();

  const tab = (params.get('tab') as TabKey) in TAB_QUERY ? (params.get('tab') as TabKey) : 'open';
  const filters: TicketFilterValues = {
    search: params.get('search') ?? '',
    clientIds: ids(params.get('clientIds')),
    productIds: ids(params.get('productIds')),
    ticketTypeIds: ids(params.get('ticketTypeIds')),
    statusIds: ids(params.get('statusIds')),
    priorityIds: ids(params.get('priorityIds')),
    assignee: params.get('assignee') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
  };
  const page = Number(params.get('page')) || 1;
  const pageSize = Number(params.get('pageSize')) || 25;
  const sortBy = (params.get('sortBy') as TicketSortField) || 'createdAt';
  const sortDir = (params.get('sortDir') as SortDir) || 'DESC';

  const query = useMemo<TicketQuery>(
    () => ({
      search: filters.search || undefined,
      clientIds: filters.clientIds.join(',') || undefined,
      productIds: filters.productIds.join(',') || undefined,
      ticketTypeIds: filters.ticketTypeIds.join(',') || undefined,
      statusIds: filters.statusIds.join(',') || undefined,
      priorityIds: filters.priorityIds.join(',') || undefined,
      assignee: filters.assignee || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      ...TAB_QUERY[tab],
      page,
      pageSize,
      sortBy,
      sortDir,
    }),
    // params is the single source of truth for every value above
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params.toString()],
  );

  const [rows, setRows] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<TicketCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, viewCounts] = await Promise.all([ticketService.list(query), ticketService.counts()]);
      setRows(result.items);
      setTotal(result.total);
      setCounts(viewCounts);
      rememberTicketNav(result.items.map((t) => t.ticketNo));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelected([]);
  }, [query]);

  const update = (patch: Record<string, string | number | number[] | undefined>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      const text = Array.isArray(value) ? value.join(',') : value === undefined ? '' : String(value);
      if (text) next.set(key, text);
      else next.delete(key);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (tab !== 'open') next.set('tab', tab);
    setParams(next, { replace: true });
  };

  const applyBulk = async (changes: Omit<BulkUpdatePayload, 'ids'>) => {
    setBulkBusy(true);
    try {
      const result = await ticketService.bulkUpdate({ ids: selected, ...changes });
      if (result.failed.length) {
        toast.error(`${result.updated} updated, ${result.failed.length} skipped: ${result.failed[0].message}`);
      } else {
        toast.success(`${result.updated} ticket${result.updated === 1 ? '' : 's'} updated`);
      }
      setSelected([]);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await ticketService.list({ ...query, page: 1, pageSize: 1000 });
      downloadCsv(
        `tickets-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Ticket No', 'Date', 'Client', 'Product', 'Module', 'Ticket type', 'Username', 'Email', 'Phone', 'Subject', 'Priority', 'Status', 'Assigned to', 'Due', 'SLA', 'Resolved on'],
        all.items.map((t) => [
          t.ticketNo,
          formatDateTime(t.createdAt),
          t.client?.name ?? '',
          t.product?.name,
          t.module?.name ?? '',
          t.ticketType?.name ?? '',
          t.username,
          t.email ?? '',
          t.phone ?? '',
          t.subject,
          t.priority?.name,
          t.status?.name,
          t.assignedTo?.name ?? 'Unassigned',
          formatDateTime(t.dueAt),
          slaState(t).label,
          t.resolvedAt ? formatDateTime(t.resolvedAt) : '',
        ]),
      );
      toast.success(`Exported ${all.items.length} tickets`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const tabs: TabItem<TabKey>[] = [
    { value: 'open', label: 'All open', count: counts?.open },
    { value: 'mine', label: 'My open', count: counts?.mine },
    { value: 'unassigned', label: 'Unassigned', count: counts?.unassigned },
    { value: 'overdue', label: 'Overdue', count: counts?.overdue, tone: 'danger' },
    { value: 'closed', label: 'Resolved & closed', count: counts?.closed },
    { value: 'all', label: 'All tickets', count: counts?.all },
  ];

  const columns: Column<Ticket>[] = [
    {
      key: 'ticketNo',
      header: 'Ticket No',
      sortKey: 'ticketNo',
      render: (t) => (
        <Link to={`/tickets/${t.ticketNo}`} className="ticket-no" onClick={(e) => e.stopPropagation()}>
          {t.ticketNo}
        </Link>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortKey: 'createdAt',
      render: (t) => (
        <div title={formatDateTime(t.createdAt)}>
          <div className="tabular">{formatDate(t.createdAt)}</div>
          <div className="cell-sub">{timeAgo(t.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client · Product',
      sortKey: 'client',
      render: (t) => (
        <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }} title={[t.client?.name, t.product?.name].filter(Boolean).join(' · ')}>
          {t.client && <span className="code-badge">{t.client.code}</span>}
          <span className="code-badge">{t.product?.code}</span>
        </span>
      ),
    },
    { key: 'username', header: 'Username', sortKey: 'username', render: (t) => <span className="cell-title" style={{ fontWeight: 600 }}>{t.username}</span> },
    {
      key: 'subject',
      header: 'Subject',
      sortKey: 'subject',
      render: (t) => (
        <div style={{ minWidth: 220 }}>
          <div className="cell-title cell-truncate">{t.subject}</div>
          <div className="cell-sub cell-tags">
            {t.ticketType && (
              <span className="type-badge" style={{ ['--c' as string]: t.ticketType.color }}>
                {t.ticketType.name}
              </span>
            )}
            {t.module && <span>{t.module.name}</span>}
          </div>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', sortKey: 'priority', render: (t) => <Chip color={t.priority?.color}>{t.priority?.name}</Chip> },
    { key: 'status', header: 'Status', sortKey: 'status', render: (t) => <Chip color={t.status?.color} square>{t.status?.name}</Chip> },
    { key: 'assignee', header: 'Assigned to', sortKey: 'assignee', render: (t) => <Avatar name={t.assignedTo?.name} size="sm" showName /> },
    { key: 'dueAt', header: 'Due', sortKey: 'dueAt', render: (t) => <DueLabel ticket={t} /> },
  ];

  const filtered = Object.values(filters).some((v) => (Array.isArray(v) ? v.length : v));

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={
          <>
            <TicketIcon size={14} /> Tickets
          </>
        }
        title="Tickets"
        actions={
          <>
            <Button icon={<RefreshCw />} iconOnly onClick={load} aria-label="Refresh" title="Refresh" />
            <Button icon={<Download />} onClick={exportCsv} loading={exporting} disabled={!total}>
              Export
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => navigate('/tickets/new')}>
              New ticket
            </Button>
          </>
        }
      />

      <section className="table-card">
        <div className="ticket-tabs">
          <Tabs<TabKey> ariaLabel="Ticket views" value={tab} items={tabs} onChange={(v) => update({ tab: v === 'open' ? undefined : v })} />
        </div>
        <TicketFilters
          values={filters}
          lookups={lookups}
          showAssignee={tab !== 'mine' && tab !== 'unassigned'}
          onChange={(patch) => update(patch)}
          onClear={clearFilters}
        />
        {error && (
          <div className="alert" style={{ margin: 16 }}>
            {error}
          </div>
        )}
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(t) => t.id}
          loading={loading}
          onRowClick={(t) => navigate(`/tickets/${t.ticketNo}`)}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={(key, dir) => update({ sortBy: key, sortDir: dir }, false)}
          skeletonRows={8}
          empty={
            filtered ? (
              <EmptyState title="No tickets match these filters" text="Clear a filter or try another search." action={<Button onClick={clearFilters}>Clear filters</Button>} />
            ) : tab === 'overdue' ? (
              <EmptyState icon={<TicketCheck />} title="Nothing overdue" text="Every open ticket is inside its SLA. Nice work." />
            ) : (
              <EmptyState
                icon={<TicketIcon />}
                title="No tickets here"
                text="Tickets you create show up in this list."
                action={
                  <Button variant="primary" icon={<Plus />} onClick={() => navigate('/tickets/new')}>
                    Create a ticket
                  </Button>
                }
              />
            )
          }
        />
        {total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => update({ page: p }, false)}
            onPageSizeChange={(size) => update({ pageSize: size })}
          />
        )}
      </section>

      {selected.length > 0 && (
        <BulkActionBar count={selected.length} lookups={lookups} busy={bulkBusy} onApply={applyBulk} onClear={() => setSelected([])} />
      )}
    </div>
  );
}
