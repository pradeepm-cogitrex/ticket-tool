import { useCallback, useState } from 'react';
import { Boxes, Flag, Plus, Star } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { RolePriorityBadge } from '../employee/components/role-priority-badge';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { useMasterList } from '../use-master-list';
import { PriorityForm } from './priority-form';
import { priorityService } from './priority.service';
import type { Priority } from './priority.types';

const hrs = (h: number) => (h >= 48 && h % 24 === 0 ? `${h / 24}d` : `${h}h`);

export default function PriorityView() {
  const { isSuperAdmin } = useAuth();
  const list = useMasterList(priorityService, useCallback((p: Priority) => p.name, []));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Priority | null>(null);
  const maxHrs = Math.max(1, ...list.rows.map((r) => r.resolveHrs));

  const openForm = (priority: Priority | null) => {
    setEditing(priority);
    setFormOpen(true);
  };

  const columns: Column<Priority>[] = [
    {
      key: 'name',
      header: 'Priority',
      render: (p) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Chip color={p.color}>{p.name}</Chip>
          {p.isDefault && (
            <span className="default-star" title="Default for new tickets">
              <Star /> Default
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'sla',
      header: 'SLA targets',
      render: (p) => (
        <div className="sla" style={{ ['--c' as string]: p.color }}>
          <div className="sla__row">
            Response
            <div className="sla__track">
              <div className="sla__fill sla__fill--soft" style={{ width: `${(p.responseHrs / maxHrs) * 100}%` }} />
            </div>
            <span className="sla__val">{hrs(p.responseHrs)}</span>
          </div>
          <div className="sla__row">
            Resolve
            <div className="sla__track">
              <div className="sla__fill" style={{ width: `${(p.resolveHrs / maxHrs) * 100}%` }} />
            </div>
            <span className="sla__val">{hrs(p.resolveHrs)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'assign',
      header: 'Assign to',
      render: (p) => (
        <span className="assign-cell">
          <RolePriorityBadge level={p.assignRolePriority} /> role priority {p.assignRolePriority}
        </span>
      ),
    },
    { key: 'tickets', header: 'Tickets', align: 'right', render: (p) => <strong className="tabular">{p.ticketCount ?? 0}</strong> },
    { key: 'order', header: 'Order', align: 'center', render: (p) => <span className="tabular muted">{p.sortOrder}</span> },
    { key: 'active', header: 'Status', render: (p) => <ActiveChip isActive={p.isActive} /> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (p) => <RowActions canEdit={isSuperAdmin} isActive={p.isActive} onEdit={() => openForm(p)} onToggle={() => list.toggleActive(p)} />,
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
        title="Priorities & SLA"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Add priority
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
          noun="priority"
        />
        {list.error && (
          <div className="alert" style={{ margin: 16 }}>
            {list.error}
          </div>
        )}
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(p) => p.id}
          loading={list.loading}
          onRowClick={isSuperAdmin ? openForm : undefined}
          empty={<EmptyState icon={<Flag />} title="No priorities" text="Add Urgent, High, Medium and Low with their SLA hours." />}
        />
      </section>

      <PriorityForm open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={list.afterSave} />
    </div>
  );
}
