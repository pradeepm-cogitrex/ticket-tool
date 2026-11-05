import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Package, Plus } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/shared/components/button';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { PageHeader } from '@/shared/components/page-header';
import { formatDate } from '@/shared/utils/date.util';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { useMasterList } from '../use-master-list';
import { ProductForm } from './product-form';
import { productService } from './product.service';
import type { Product } from './product.types';

export default function ProductView() {
  const { isSuperAdmin } = useAuth();
  const list = useMasterList(productService, useCallback((p: Product) => p.name, []));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const openForm = (product: Product | null) => {
    setEditing(product);
    setFormOpen(true);
  };

  const columns: Column<Product>[] = [
    { key: 'code', header: 'Code', width: 120, render: (p) => <span className="code-badge">{p.code}</span> },
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div>
          <div className="cell-title">{p.name}</div>
          {p.description && <div className="cell-sub cell-truncate">{p.description}</div>}
        </div>
      ),
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'right',
      render: (p) => (
        <Link to="/masters/organization-employees" className="tabular" onClick={(e) => e.stopPropagation()}>
          {p.employeeCount ?? 0}
        </Link>
      ),
    },
    {
      key: 'clients',
      header: 'Clients',
      align: 'right',
      render: (p) => (
        <Link to={`/masters/client-products?productId=${p.id}`} className="tabular" onClick={(e) => e.stopPropagation()}>
          {p.clientCount ?? 0}
        </Link>
      ),
    },
    { key: 'tickets', header: 'Tickets', align: 'right', render: (p) => <strong className="tabular">{p.ticketCount ?? 0}</strong> },
    { key: 'order', header: 'Order', align: 'center', render: (p) => <span className="tabular muted">{p.sortOrder}</span> },
    { key: 'active', header: 'Status', render: (p) => <ActiveChip isActive={p.isActive} /> },
    { key: 'created', header: 'Created on', render: (p) => <span className="tabular muted">{formatDate(p.createdAt)}</span> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (p) => <RowActions canEdit={isSuperAdmin} isActive={p.isActive} onEdit={() => openForm(p)} onToggle={() => list.toggleActive(p)} />,
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
        title="Products"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Add product
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
          noun="product"
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
          rowKey={(p) => p.id}
          loading={list.loading}
          onRowClick={isSuperAdmin ? openForm : undefined}
          empty={
            filtered ? (
              <EmptyState title="No products match" text="Try a different search or show all products." />
            ) : (
              <EmptyState
                icon={<Package />}
                title="No products yet"
                text="Add the products you support, like HRMS or AI BOT. Then map them to clients in Client-Product Map."
                action={
                  isSuperAdmin && (
                    <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
                      Add product
                    </Button>
                  )
                }
              />
            )
          }
        />
      </section>

      <ProductForm open={formOpen} item={editing} onClose={() => setFormOpen(false)} onSaved={list.afterSave} />
    </div>
  );
}
