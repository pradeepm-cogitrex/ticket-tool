import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Network, Plus, Users } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { ROLE_LABEL, UserRole } from '@/modules/auth/auth.types';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { SelectInput } from '@/shared/components/form/select-input';
import { PageHeader } from '@/shared/components/page-header';
import { Segmented } from '@/shared/components/segmented';
import { timeAgo } from '@/shared/utils/date.util';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { useLookups } from '../use-lookups';
import { useMasterList } from '../use-master-list';
import { RolePriorityBadge } from './components/role-priority-badge';
import { EmployeeForm } from './employee-form';
import { employeeService } from './employee.service';
import type { Employee, EmployeeQuery } from './employee.types';

export default function EmployeeView() {
  const { isSuperAdmin, user } = useAuth();
  const { lookups } = useLookups();
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [clientId, setClientId] = useState<number | undefined>();
  const [productId, setProductId] = useState<number | undefined>();
  const extra = useMemo<Partial<EmployeeQuery>>(
    () => ({ role: role === 'all' ? undefined : role, clientId, productId }),
    [role, clientId, productId],
  );
  const list = useMasterList<Employee, EmployeeQuery>(employeeService, useCallback((e: Employee) => e.name, []), extra);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const openForm = (employee: Employee | null) => {
    setEditing(employee);
    setFormOpen(true);
  };

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Employee',
      render: (e) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={e.name} size="lg" />
          <span>
            <div className="cell-title">
              {e.name} {e.id === user?.id && <span className="muted" style={{ fontWeight: 600 }}>(you)</span>}
            </div>
            <div className="cell-sub">{e.email}</div>
          </span>
        </span>
      ),
    },
    {
      key: 'orgs',
      header: 'Client products · role priority',
      render: (e) =>
        e.role === 'super_admin' ? (
          <span className="muted">Every client and product</span>
        ) : e.assignments.length ? (
          <span className="org-tags">
            {e.assignments.map((a) => (
              <span key={a.id} className="org-tag">
                {a.product.name} · {a.client.name}
                <RolePriorityBadge level={a.rolePriority} />
              </span>
            ))}
          </span>
        ) : (
          <span className="muted">Not assigned</span>
        ),
    },
    {
      key: 'role',
      header: 'Access',
      render: (e) => <span className={`chip chip--square role-chip--${e.role}`}>{ROLE_LABEL[e.role]}</span>,
    },
    { key: 'open', header: 'Open tickets', align: 'right', render: (e) => <strong className="tabular">{e.openTickets ?? 0}</strong> },
    { key: 'login', header: 'Last sign-in', render: (e) => <span className="muted">{e.lastLoginAt ? timeAgo(e.lastLoginAt) : 'Never'}</span> },
    { key: 'active', header: 'Status', render: (e) => <ActiveChip isActive={e.isActive} /> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (e) => <RowActions canEdit={isSuperAdmin} isActive={e.isActive} onEdit={() => openForm(e)} onToggle={() => list.toggleActive(e)} />,
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
        title="Employees"
        actions={
          <>
            <Link to="/masters/organization-employees" className="btn">
              <Network /> By client product
            </Link>
            {isSuperAdmin && (
              <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
                Add employee
              </Button>
            )}
          </>
        }
      />

      <section className="table-card">
        <MasterToolbar
          search={list.search}
          onSearch={list.setSearch}
          active={list.active}
          onActive={list.setActive}
          count={list.rows.length}
          noun="employee"
          placeholder="Search by name or email"
        >
          <SelectInput
            className="master-filter"
            aria-label="Filter by client"
            placeholder="All clients"
            value={clientId ?? ''}
            onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : undefined)}
            options={(lookups?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectInput
            className="master-filter"
            aria-label="Filter by product"
            placeholder="All products"
            value={productId ?? ''}
            onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : undefined)}
            options={(lookups?.products ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
          <Segmented<UserRole | 'all'>
            ariaLabel="Filter by access"
            value={role}
            onChange={setRole}
            options={[
              { value: 'all', label: 'All' },
              { value: 'super_admin', label: 'Super admins' },
              { value: 'admin', label: 'Admins' },
              { value: 'employee', label: 'Employees' },
            ]}
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
          rowKey={(e) => e.id}
          loading={list.loading}
          onRowClick={isSuperAdmin ? openForm : undefined}
          empty={<EmptyState icon={<Users />} title="No employees match" text="Try another search, client or product." />}
        />
      </section>

      <EmployeeForm open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={list.afterSave} />
    </div>
  );
}
