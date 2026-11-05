import { useCallback, useMemo, useState } from 'react';
import { Boxes, Contact as ContactIcon, Mail, Phone, Plus } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { Button } from '@/shared/components/button';
import { Column, DataTable } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { SelectInput } from '@/shared/components/form/select-input';
import { PageHeader } from '@/shared/components/page-header';
import { MasterToolbar } from '../components/master-toolbar';
import { ActiveChip, RowActions } from '../components/row-actions';
import { pairLabel } from '../client-product/client-product.types';
import { useLookups } from '../use-lookups';
import { useMasterList } from '../use-master-list';
import { ContactForm } from './contact-form';
import { contactService } from './contact.service';
import type { Contact, ContactQuery } from './contact.types';

export default function ContactView() {
  const { isSuperAdmin } = useAuth();
  const { lookups } = useLookups();
  const [pairId, setPairId] = useState<number | undefined>();
  const pair = lookups?.clientProducts.find((cp) => cp.id === pairId);
  const extra = useMemo<Partial<ContactQuery>>(
    () => ({ clientId: pair?.clientId, productId: pair?.productId }),
    [pair?.clientId, pair?.productId],
  );
  const defaultPair = useMemo(
    () => (pair ? { clientId: pair.clientId, productId: pair.productId } : undefined),
    [pair],
  );
  const list = useMasterList<Contact, ContactQuery>(contactService, useCallback((c: Contact) => c.name, []), extra);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);

  const openForm = (contact: Contact | null) => {
    setEditing(contact);
    setFormOpen(true);
  };

  const columns: Column<Contact>[] = [
    { key: 'name', header: 'Name', render: (c) => <div className="cell-title">{c.name}</div> },
    {
      key: 'pair',
      header: 'Client product',
      render: (c) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span className="code-badge">{c.client?.code}</span>
          <span className="code-badge">{c.product?.code}</span>
        </span>
      ),
    },
    {
      key: 'username',
      header: 'Username',
      render: (c) => (c.username ? <span className="mono">{c.username}</span> : <span className="muted">—</span>),
    },
    {
      key: 'reach',
      header: 'Email / WhatsApp',
      render: (c) => (
        <div>
          {c.email && (
            <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={12} /> {c.email}
            </div>
          )}
          {c.phone && (
            <div className="cell-sub tabular" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={12} /> {c.phone}
            </div>
          )}
        </div>
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

  const filtered = !!list.search || list.active !== 'all' || !!pairId;

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={
          <>
            <Boxes size={14} /> Masters
          </>
        }
        title="User Contacts"
        actions={
          isSuperAdmin && (
            <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
              Add contact
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
          noun="contact"
          placeholder="Search name, username, email or number"
        >
          <SelectInput
            className="master-filter"
            aria-label="Filter by client product"
            placeholder="All client products"
            value={pairId ?? ''}
            onChange={(e) => setPairId(e.target.value ? Number(e.target.value) : undefined)}
            options={(lookups?.clientProducts ?? []).map((cp) => ({ value: cp.id, label: pairLabel(cp) }))}
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
              <EmptyState title="No contacts match" text="Try another client product or search." />
            ) : (
              <EmptyState
                icon={<ContactIcon />}
                title="No user contacts yet"
                text="Add the people who use each client product, with their username, email and WhatsApp number, so they can be informed about their tickets."
                action={
                  isSuperAdmin && (
                    <Button variant="primary" icon={<Plus />} onClick={() => openForm(null)}>
                      Add contact
                    </Button>
                  )
                }
              />
            )
          }
        />
      </section>

      <ContactForm open={formOpen} item={editing} defaultPair={defaultPair} onClose={() => setFormOpen(false)} onSaved={list.afterSave} />
    </div>
  );
}
