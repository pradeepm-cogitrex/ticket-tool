import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Building2, Plus } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/shared/components/button';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatDate } from '@/shared/utils/date.util';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { useMasterList } from '../use-master-list';
import { ClientForm } from './client-form';
import { clientService } from './client.service';
import type { Client } from './client.types';

export default function ClientView() {
  const { isSuperAdmin } = useAuth();
  const list = useMasterList(clientService, useCallback((c: Client) => c.name, []));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const openForm = (client: Client | null) => {
    setEditing(client);
    setFormOpen(true);
  };

  const columns: Column<Client>[] = [
    { key: 'code', header: 'Code', width: 120, render: (c) => <span className="code-badge">{c.code}</span> },
    {
      key: 'name',
      header: 'Client',
      render: (c) => (
        <div>
          <div className="cell-title">{c.name}</div>
          {c.description && <div className="cell-sub cell-truncate">{c.description}</div>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (c) =>
        c.contactEmail || c.contactPhone ? (
          <div>
            {c.contactEmail && <div className="cell-sub">{c.contactEmail}</div>}
            {c.contactPhone && <div className="cell-sub">{c.contactPhone}</div>}
          </div>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: 'products',
      header: 'Products',
      align: 'right',
      render: (c) => (
        <Link to={`/masters/client-products?clientId=${c.id}`} className="tabular" onClick={(e) => e.stopPropagation()}>
          {c.productCount ?? 0}
        </Link>
      ),
    },
    { key: 'tickets', header: 'Tickets', align: 'right', render: (c) => <strong className="tabular">{c.ticketCount ?? 0}</strong> },
    { key: 'active', header: 'Status', render: (c) => <ActiveChip isActive={c.isActive} /> },
    { key: 'created', header: 'Created on', render: (c) => <span className="tabular muted">{formatDate(c.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (c) => <RowActions canEdit={isSuperAdmin} isActive={c.isActive} onEdit={() => openForm(c)} onToggle={() => list.toggleActive(c)} />,
    },
  ];

  const filtered = !!list.search || list.active !== 'all';

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={
          <>
            <Boxes size={14} /> Masters
          </>
        }
        title="Clients"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Add client
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
          noun="client"
          placeholder="Search by code or name"
        />
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
              <EmptyState title="No clients match" text="Try a different search or show all clients." />
            ) : (
              <EmptyState
                icon={<Building2 />}
                title="No clients yet"
                text="Add the companies you support, like Sakku or Google, then map your products to them."
                action={
                  isSuperAdmin && (
                    <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
                      Add client
                    </Button>
                  )
                }
              />
            )
          }
        />
      </section>

      <ClientForm open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={list.afterSave} />
    </div>
  );
}
