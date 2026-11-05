import { Fragment, useCallback, useState } from 'react';
import { Boxes, ChevronRight, CircleCheck, CircleDot, Plus, Star, Workflow } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { useMasterList } from '../use-master-list';
import { StatusForm } from './status-form';
import { statusService } from './status.service';
import type { Status } from './status.types';

const YesNo = ({ value }: { value: boolean }) => <span className={value ? 'flag-yes' : 'flag-no'}>{value ? 'Yes' : 'No'}</span>;

export default function StatusView() {
  const { isSuperAdmin } = useAuth();
  const list = useMasterList(statusService, useCallback((s: Status) => s.name, []));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Status | null>(null);
  const flow = list.rows.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

  const openForm = (status: Status | null) => {
    setEditing(status);
    setFormOpen(true);
  };

  const columns: Column<Status>[] = [
    {
      key: 'name',
      header: 'Status',
      render: (s) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Chip color={s.color}>{s.name}</Chip>
          {s.isDefault && (
            <span className="default-star" title="New tickets start here">
              <Star /> Start
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (s) => (
        <span className="type-tag">
          {s.type === 'open' ? <CircleDot color="var(--info)" /> : <CircleCheck color="var(--success)" />}
          {s.type === 'open' ? 'Open' : 'Closed'}
        </span>
      ),
    },
    { key: 'pause', header: 'Pauses SLA', render: (s) => <YesNo value={s.pausesSla} /> },
    { key: 'note', header: 'Needs note', render: (s) => <YesNo value={s.requiresNote} /> },
    { key: 'lock', header: 'Locks ticket', render: (s) => <YesNo value={s.locksTicket} /> },
    { key: 'tickets', header: 'Tickets', align: 'right', render: (s) => <strong className="tabular">{s.ticketCount ?? 0}</strong> },
    { key: 'active', header: 'Status', render: (s) => <ActiveChip isActive={s.isActive} /> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (s) => <RowActions canEdit={isSuperAdmin} isActive={s.isActive} onEdit={() => openForm(s)} onToggle={() => list.toggleActive(s)} />,
    },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={
          <>
            <Boxes size={14} /> Masters
          </>
        }
        title="Statuses"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Add status
            </Button>
          )
        }
      />

      {flow.length > 0 && (
        <div className="workflow">
          <span className="workflow__label">Workflow</span>
          {flow.map((s, i) => (
            <Fragment key={s.id}>
              {i > 0 && <ChevronRight className="workflow__arrow" />}
              <Chip color={s.color}>{s.name}</Chip>
            </Fragment>
          ))}
        </div>
      )}

      <section className="table-card">
        <MasterToolbar
          search={list.search}
          onSearch={list.setSearch}
          active={list.active}
          onActive={list.setActive}
          count={list.rows.length}
          noun="status"
          placeholder="Search statuses"
        />
        {list.error && (
          <div className="alert" style={{ margin: 16 }}>
            {list.error}
          </div>
        )}
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(s) => s.id}
          loading={list.loading}
          onRowClick={isSuperAdmin ? openForm : undefined}
          empty={<EmptyState icon={<Workflow />} title="No statuses" text="Add Open, In Progress, On Hold, Resolved and Closed." />}
        />
      </section>

      <StatusForm open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={list.afterSave} />
    </div>
  );
}
