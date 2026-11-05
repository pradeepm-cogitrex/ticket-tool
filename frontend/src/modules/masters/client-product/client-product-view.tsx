import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Boxes, Code2, Link2, Plus } from 'lucide-react';
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
import { ClientProductForm } from './client-product-form';
import { clientProductService } from './client-product.service';
import { pairLabel } from './client-product.types';
import type { ClientProduct, ClientProductQuery } from './client-product.types';
import { IntegrationScriptDialog } from './integration-script-dialog';

const numberParam = (v: string | null) => (v && Number(v) > 0 ? Number(v) : undefined);

export default function ClientProductView() {
  const { isSuperAdmin } = useAuth();
  const { lookups } = useLookups();
  const [params, setParams] = useSearchParams();
  const clientId = numberParam(params.get('clientId'));
  const productId = numberParam(params.get('productId'));
  const extra = useMemo<Partial<ClientProductQuery>>(() => ({ clientId, productId }), [clientId, productId]);
  const list = useMasterList<ClientProduct, ClientProductQuery>(clientProductService, useCallback((cp: ClientProduct) => pairLabel(cp), []), extra);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientProduct | null>(null);
  const [scriptFor, setScriptFor] = useState<ClientProduct | null>(null);

  const setFilter = (key: 'clientId' | 'productId', value?: number) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, String(value));
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const openForm = (mapping: ClientProduct | null) => {
    setEditing(mapping);
    setFormOpen(true);
  };

  const priorities = lookups?.priorities ?? [];
  const priorityOf = (id: number) => priorities.find((p) => p.id === id);

  const columns: Column<ClientProduct>[] = [
    {
      key: 'client',
      header: 'Client',
      render: (cp) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="code-badge">{cp.client.code}</span>
          <span className="cell-title">{cp.client.name}</span>
        </span>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (cp) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="code-badge">{cp.product.code}</span>
          {cp.product.name}
        </span>
      ),
    },
    {
      key: 'sla',
      header: 'SLA (response / resolution)',
      render: (cp) =>
        cp.slas.length ? (
          <span className="sla-tags">
            {[...cp.slas]
              .sort((a, b) => (priorityOf(a.priorityId)?.sortOrder ?? 0) - (priorityOf(b.priorityId)?.sortOrder ?? 0))
              .map((s) => {
                const p = priorityOf(s.priorityId);
                return (
                  <span key={s.priorityId} className="sla-tag" style={{ ['--c' as string]: p?.color }}>
                    {p?.name ?? 'Priority'} <strong className="tabular">{s.responseHrs}h / {s.resolveHrs}h</strong>
                  </span>
                );
              })}
          </span>
        ) : (
          <span className="muted">Priority master hours</span>
        ),
    },
    {
      key: 'employees',
      header: 'Employees',
      align: 'right',
      render: (cp) => (
        <Link to="/masters/organization-employees" className="tabular" onClick={(e) => e.stopPropagation()}>
          {cp.employeeCount ?? 0}
        </Link>
      ),
    },
    { key: 'tickets', header: 'Tickets', align: 'right', render: (cp) => <strong className="tabular">{cp.ticketCount ?? 0}</strong> },
    {
      key: 'script',
      header: 'Widget',
      render: (cp) => (
        <Button
          size="sm"
          icon={<Code2 />}
          onClick={(e) => {
            e.stopPropagation();
            setScriptFor(cp);
          }}
          disabled={!cp.clientKey}
          title="HelpX Bot script for this client product"
        >
          Script
        </Button>
      ),
    },
    { key: 'active', header: 'Status', render: (cp) => <ActiveChip isActive={cp.isActive} /> },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (cp) => <RowActions canEdit={isSuperAdmin} isActive={cp.isActive} onEdit={() => openForm(cp)} onToggle={() => list.toggleActive(cp)} />,
    },
  ];

  const filtered = !!list.search || list.active !== 'all' || !!clientId || !!productId;

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={
          <>
            <Boxes size={14} /> Masters
          </>
        }
        title="Client-Product Map"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Map product
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
          noun="mapping"
          placeholder="Search client or product"
        >
          <SelectInput
            className="master-filter"
            aria-label="Filter by client"
            placeholder="All clients"
            value={clientId ?? ''}
            onChange={(e) => setFilter('clientId', numberParam(e.target.value))}
            options={(lookups?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectInput
            className="master-filter"
            aria-label="Filter by product"
            placeholder="All products"
            value={productId ?? ''}
            onChange={(e) => setFilter('productId', numberParam(e.target.value))}
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
          rowKey={(cp) => cp.id}
          loading={list.loading}
          onRowClick={isSuperAdmin ? openForm : undefined}
          empty={
            filtered ? (
              <EmptyState title="No client products match" text="Try another client, product or search." />
            ) : (
              <EmptyState
                icon={<Link2 />}
                title="No products mapped yet"
                text="Map a product to a client, e.g. HRMS for Sakku and HRMS for Google, and set the SLA hours you agreed with them."
                action={
                  isSuperAdmin && (
                    <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
                      Map product
                    </Button>
                  )
                }
              />
            )
          }
        />
      </section>

      <ClientProductForm
        open={formOpen}
        item={editing}
        defaultClientId={clientId}
        defaultProductId={productId}
        onClose={() => setFormOpen(false)}
        onSaved={list.afterSave}
      />
      <IntegrationScriptDialog mapping={scriptFor} onClose={() => setScriptFor(null)} />
    </div>
  );
}
