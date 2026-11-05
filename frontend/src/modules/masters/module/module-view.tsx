import { useCallback, useMemo, useState } from 'react';
import { Boxes, Plus, Tags } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/shared/components/button';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { SelectInput } from '@/shared/components/form/select-input';
import { PageHeader } from '@/shared/components/page-header';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { useLookups } from '../use-lookups';
import { useMasterList } from '../use-master-list';
import { ModuleForm } from './module-form';
import { moduleService } from './module.service';
import type { ModuleMaster, ModuleQuery } from './module.types';

export default function ModuleView() {
  const { isSuperAdmin } = useAuth();
  const { lookups } = useLookups();
  const [productId, setProductId] = useState<number | undefined>();
  const extra = useMemo<Partial<ModuleQuery>>(() => ({ productId }), [productId]);
  const list = useMasterList<ModuleMaster, ModuleQuery>(moduleService, useCallback((m: ModuleMaster) => m.name, []), extra);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleMaster | null>(null);

  const openForm = (module: ModuleMaster | null) => {
    setEditing(module);
    setFormOpen(true);
  };

  const columns: Column<ModuleMaster>[] = [
    {
      key: 'name',
      header: 'Module',
      render: (c) => (
        <div>
          <div className="cell-title">{c.name}</div>
          {c.description && <div className="cell-sub cell-truncate">{c.description}</div>}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (c) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="code-badge">{c.product?.code}</span>
          {c.product?.name}
        </span>
      ),
    },
    { key: 'tickets', header: 'Tickets', align: 'right', render: (c) => <strong className="tabular">{c.ticketCount ?? 0}</strong> },
    { key: 'active', header: 'Status', render: (c) => <ActiveChip isActive={c.isActive} /> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (c) => <RowActions canEdit={isSuperAdmin} isActive={c.isActive} onEdit={() => openForm(c)} onToggle={() => list.toggleActive(c)} />,
    },
  ];

  const filtered = !!list.search || list.active !== 'all' || !!productId;

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={
          <>
            <Boxes size={14} /> Masters
          </>
        }
        title="Modules"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Add module
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
          noun="module"
          placeholder="Search modules"
        >
          <SelectInput
            className="master-filter"
            aria-label="Filter by product"
            placeholder="All products"
            value={productId ?? ''}
            onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : undefined)}
            options={(lookups?.products ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
        </MasterToolbar>
        {list.error && (
          <div className="alert" style={{ margin: 16 }}>
            {list.error}
          </div>
        )}
        <DataTable
          columns={columns}
          rows={list.rows}
          rowKey={(c) => c.id}
          loading={list.loading}
          onRowClick={isSuperAdmin ? openForm : undefined}
          empty={
            filtered ? (
              <EmptyState title="No modules match" text="Try another product or search." />
            ) : (
              <EmptyState
                icon={<Tags />}
                title="No modules yet"
                text="Add the parts of each product, like Attendance, Payroll or Payslip for HRMS, so tickets are easier to sort."
                action={
                  isSuperAdmin && (
                    <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
                      Add module
                    </Button>
                  )
                }
              />
            )
          }
        />
      </section>

      <ModuleForm
        open={formOpen}
        item={editing}
        defaultProductId={productId}
        onClose={() => setFormOpen(false)}
        onSaved={list.afterSave}
      />
    </div>
  );
}
