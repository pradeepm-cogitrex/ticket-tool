import { useCallback, useState } from 'react';
import { Boxes, Plus, Shapes, Star } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { useMasterList } from '../use-master-list';
import { TicketTypeForm } from './ticket-type-form';
import { ticketTypeService } from './ticket-type.service';
import type { TicketType } from './ticket-type.types';

export default function TicketTypeView() {
  const { isSuperAdmin } = useAuth();
  const list = useMasterList(ticketTypeService, useCallback((t: TicketType) => t.name, []));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TicketType | null>(null);

  const openForm = (type: TicketType | null) => {
    setEditing(type);
    setFormOpen(true);
  };

  const columns: Column<TicketType>[] = [
    {
      key: 'name',
      header: 'Ticket type',
      render: (t) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Chip color={t.color}>{t.name}</Chip>
          {t.isDefault && (
            <span className="default-star" title="Pre-selected on new tickets">
              <Star /> Default
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'desc',
      header: 'Description',
      render: (t) => (t.description ? <span className="cell-sub cell-truncate">{t.description}</span> : <span className="muted">—</span>),
    },
    { key: 'tickets', header: 'Tickets', align: 'right', render: (t) => <strong className="tabular">{t.ticketCount ?? 0}</strong> },
    { key: 'order', header: 'Order', align: 'center', render: (t) => <span className="tabular muted">{t.sortOrder}</span> },
    { key: 'active', header: 'Status', render: (t) => <ActiveChip isActive={t.isActive} /> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (t) => <RowActions canEdit={isSuperAdmin} isActive={t.isActive} onEdit={() => openForm(t)} onToggle={() => list.toggleActive(t)} />,
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
        title="Ticket types"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Add ticket type
            </Button>
          )
        }
      />

      <section className="table-card">
        <MasterToolbar
          search={list.search}
          onSearch={list.setSearch}
          active={list.active}
          onActive={list.setActive}
          count={list.rows.length}
          noun="ticket type"
          placeholder="Search ticket types"
        />
        {list.error && (
          <div className="alert" style={{ margin: 16 }}>
            {list.error}
          </div>
        )}
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(t) => t.id}
          loading={list.loading}
          onRowClick={isSuperAdmin ? openForm : undefined}
          empty={
            <EmptyState
              icon={<Shapes />}
              title="No ticket types"
              text="Add Incident, Change Request, Blocker and any other kinds of ticket you handle."
            />
          }
        />
      </section>

      <TicketTypeForm open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={list.afterSave} />
    </div>
  );
}
