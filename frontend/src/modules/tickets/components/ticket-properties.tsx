import { useEffect, useMemo, useState } from 'react';
import { Lock, RotateCcw, Send } from 'lucide-react';
import { clientsOf, myClientProducts, productsOf, type Lookups } from '@/modules/masters/use-lookups';
import type { SessionUser } from '@/modules/auth/auth.types';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';
import { Field } from '@/shared/components/form/field';
import { SelectInput } from '@/shared/components/form/select-input';
import { TextArea } from '@/shared/components/form/text-area';
import type { Contact } from '@/modules/masters/contact/contact.types';
import type { TicketDetail, UpdateTicketPayload } from '../ticket.types';

interface TicketPropertiesProps {
  ticket: TicketDetail;
  lookups: Lookups | null;
  saving: boolean;
  /** an admin may still change the status of a locked (closed) ticket to reopen it */
  isAdmin: boolean;
  user: SessionUser | null;
  /** active user contacts of the ticket's client product */
  contacts: Contact[];
  onSave: (changes: UpdateTicketPayload) => void;
}

type Draft = Required<Pick<UpdateTicketPayload, 'productId' | 'priorityId' | 'statusId'>> & {
  clientId: number;
  moduleId: number | null;
  ticketTypeId: number;
  assignedToId: number | null;
  contactId: number | null;
  resolutionNote: string;
  rcaNote: string;
};

const toDraft = (t: TicketDetail): Draft => ({
  clientId: t.clientId ?? 0,
  productId: t.productId,
  moduleId: t.moduleId,
  ticketTypeId: t.ticketTypeId ?? 0,
  priorityId: t.priorityId,
  statusId: t.statusId,
  assignedToId: t.assignedToId,
  contactId: t.contactId,
  resolutionNote: t.resolutionNote ?? '',
  rcaNote: t.rcaNote ?? '',
});

const RCA_BY_LABEL = { agent: 'Agent', human: 'Human' } as const;

/**
 * Right-hand panel: change Status, Priority, Assigned to… then Submit.
 * Open → In Progress → Resolved (needs a resolution note) → Closed. Closed locks every field.
 */
export function TicketProperties({ ticket, lookups, saving, isAdmin, user, contacts, onSave }: TicketPropertiesProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(ticket));
  const [noteError, setNoteError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(ticket));
    setNoteError(null);
  }, [ticket]);

  const locked = ticket.status.locksTicket;
  const statusEditable = !locked || isAdmin;

  const original = useMemo(() => toDraft(ticket), [ticket]);
  const changes = useMemo(() => {
    const out: UpdateTicketPayload = {};
    (Object.keys(draft) as (keyof Draft)[]).forEach((key) => {
      if (draft[key] !== original[key]) {
        const value = draft[key];
        (out as Record<string, unknown>)[key] = typeof value === 'string' ? value.trim() || null : value;
      }
    });
    return out;
  }, [draft, original]);
  const changeCount = Object.keys(changes).length;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      if (key === 'productId') next.moduleId = null;
      // a contact belongs to one client product
      if (key === 'productId' || key === 'clientId') next.contactId = null;
      // a new client: keep the product if that client has it, otherwise pick its first product
      if (key === 'clientId') {
        const theirs = pairs.filter((cp) => cp.clientId === value);
        if (!theirs.some((cp) => cp.productId === d.productId)) {
          next.productId = theirs[0]?.productId ?? d.productId;
          next.moduleId = null;
        }
      }
      // a new client product: keep the assignee only if they are mapped to it
      if ((key === 'clientId' || key === 'productId') && next.assignedToId) {
        const assignee = lookups?.employees.find((e) => e.id === next.assignedToId);
        if (!assignee?.assignments.some((a) => a.clientId === next.clientId && a.productId === next.productId)) next.assignedToId = null;
      }
      return next;
    });
    if (key === 'resolutionNote' || key === 'statusId') setNoteError(null);
  };

  const statuses = (lookups?.statuses ?? []).filter((s) => s.isActive || s.id === ticket.statusId);
  const nextStatus = statuses.find((s) => s.id === draft.statusId);
  const needsNote = !!nextStatus?.requiresNote;
  // the ticket can move only to client products the user works on (any for a super admin)
  const pairs = myClientProducts(lookups, user);
  const current = (lookups?.clientProducts ?? []).find((cp) => cp.clientId === ticket.clientId && cp.productId === ticket.productId);
  const allPairs = current && !pairs.includes(current) ? [current, ...pairs] : pairs;
  const clients = clientsOf(allPairs);
  const products = productsOf(allPairs.filter((cp) => cp.clientId === draft.clientId));
  const modules = (lookups?.modules ?? []).filter((m) => m.productId === draft.productId && (m.isActive || m.id === ticket.moduleId));
  const ticketTypes = (lookups?.ticketTypes ?? []).filter((t) => t.isActive || t.id === ticket.ticketTypeId);
  const priorities = (lookups?.priorities ?? []).filter((p) => p.isActive || p.id === ticket.priorityId);
  // only active employees mapped to the chosen client product, by role priority
  const employees = (lookups?.employees ?? [])
    .filter((e) => e.isActive)
    .map((e) => ({ e, level: e.assignments.find((a) => a.clientId === draft.clientId && a.productId === draft.productId)?.rolePriority }))
    .filter((x): x is { e: (typeof x)['e']; level: number } => x.level !== undefined)
    .sort((a, b) => a.level - b.level || a.e.name.localeCompare(b.e.name));

  const pairChanged = draft.clientId !== original.clientId || draft.productId !== original.productId;
  const contactOptions =
    ticket.contact && !contacts.some((c) => c.id === ticket.contact?.id) ? [ticket.contact, ...contacts] : contacts;

  const submit = () => {
    if (needsNote && !draft.resolutionNote.trim()) {
      setNoteError(`Add a resolution note before moving to ${nextStatus?.name}`);
      document.getElementById('prop-note')?.focus();
      return;
    }
    onSave(changes);
  };

  return (
    <div className="props">
      {locked && (
        <div className="props__locked">
          <Lock size={14} /> {ticket.status.name} — this ticket is read-only
          {isAdmin && <span>As an admin you can change the status to reopen it.</span>}
        </div>
      )}

      <div className="props__grid">
        <Field label="Status" htmlFor="prop-status">
          <SelectInput
            id="prop-status"
            value={draft.statusId}
            disabled={!statusEditable}
            onChange={(e) => set('statusId', Number(e.target.value))}
            options={statuses.map((s) => ({ value: s.id, label: s.name }))}
          />
        </Field>

        {(needsNote || ticket.resolutionNote) && (
          <Field label="Resolution note" htmlFor="prop-note" required={needsNote} error={noteError}>
            <TextArea
              id="prop-note"
              placeholder="Enter Resolution Note"
              rows={3}
              style={{ minHeight: 84 }}
              value={draft.resolutionNote}
              disabled={locked}
              invalid={!!noteError}
              onChange={(e) => set('resolutionNote', e.target.value)}
            />
          </Field>
        )}

        <Field label="Priority" htmlFor="prop-priority" hint={draft.priorityId !== ticket.priorityId ? 'Due date will move to match' : undefined}>
          <SelectInput
            id="prop-priority"
            value={draft.priorityId}
            disabled={locked}
            onChange={(e) => set('priorityId', Number(e.target.value))}
            options={priorities.map((p) => ({ value: p.id, label: p.name }))}
          />
        </Field>
        <Field label="Assigned to" htmlFor="prop-assignee">
          <SelectInput
            id="prop-assignee"
            placeholder="Unassigned"
            value={draft.assignedToId ?? ''}
            disabled={locked}
            onChange={(e) => set('assignedToId', e.target.value ? Number(e.target.value) : null)}
            options={employees.map(({ e, level }) => ({ value: e.id, label: level ? `${e.name} · P${level}` : e.name }))}
          />
        </Field>
        <Field label="Ticket type" htmlFor="prop-type">
          <SelectInput
            id="prop-type"
            placeholder={ticket.ticketTypeId ? undefined : 'Select Ticket Type'}
            value={draft.ticketTypeId || ''}
            disabled={locked}
            onChange={(e) => set('ticketTypeId', Number(e.target.value))}
            options={ticketTypes.map((t) => ({ value: t.id, label: t.name }))}
          />
        </Field>
        <Field label="Client" htmlFor="prop-client" hint={!ticket.clientId ? 'Raised before clients existed' : undefined}>
          <SelectInput
            id="prop-client"
            placeholder={ticket.clientId ? undefined : 'Select Client'}
            value={draft.clientId || ''}
            disabled={locked}
            onChange={(e) => set('clientId', Number(e.target.value))}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>
        <Field label="Product" htmlFor="prop-product" hint={draft.clientId !== ticket.clientId || draft.productId !== ticket.productId ? "Due date follows the client's SLA" : undefined}>
          <SelectInput
            id="prop-product"
            value={draft.productId}
            disabled={locked || !draft.clientId}
            onChange={(e) => set('productId', Number(e.target.value))}
            options={(products.some((p) => p.id === draft.productId) ? products : [ticket.product, ...products]).map((p) => ({ value: p.id, label: p.name }))}
          />
        </Field>
        <Field label="Module" htmlFor="prop-module">
          <SelectInput
            id="prop-module"
            placeholder={modules.length ? 'Select Module' : 'No Modules'}
            value={draft.moduleId ?? ''}
            disabled={locked}
            onChange={(e) => set('moduleId', e.target.value ? Number(e.target.value) : null)}
            options={modules.map((m) => ({ value: m.id, label: m.name }))}
          />
        </Field>

        <div className="props__divider">Root cause (RCA)</div>
        <Field
          label="RCA note"
          htmlFor="prop-rca"
          hint={draft.rcaNote !== original.rcaNote ? 'Saving it sets RCA by to Human' : undefined}
        >
          <TextArea
            id="prop-rca"
            placeholder="What caused the issue: network, performance, code, data, access…"
            rows={3}
            style={{ minHeight: 84 }}
            value={draft.rcaNote}
            disabled={locked}
            onChange={(e) => set('rcaNote', e.target.value)}
          />
        </Field>
        <div className="props__row">
          <span className="props__row-label">RCA by</span>
          {ticket.rcaBy ? (
            <span className={`rca-by rca-by--${ticket.rcaBy}`}>{RCA_BY_LABEL[ticket.rcaBy]}</span>
          ) : (
            <span className="muted">Not added yet</span>
          )}
        </div>

        <div className="props__divider">Raised by</div>
        <div className="raised-by">
          <Avatar name={ticket.raisedBy?.name ?? ticket.username} />
          <div className="raised-by__meta">
            <strong>{ticket.raisedBy?.name ?? ticket.username}</strong>
            {ticket.email && <span>{ticket.email}</span>}
            {ticket.phone && <span>{ticket.phone}</span>}
          </div>
        </div>
        <Field
          label="User contact"
          htmlFor="prop-contact"
          hint={
            pairChanged
              ? 'Submit the client / product change first'
              : !ticket.contactId && !contactOptions.length
                ? 'No contacts for this client product yet (Masters › User Contacts)'
                : !ticket.contactId
                  ? 'No contact matched the username. Pick one to inform them.'
                  : undefined
          }
        >
          <SelectInput
            id="prop-contact"
            placeholder="Select Contact"
            value={draft.contactId ?? ''}
            disabled={locked || pairChanged}
            onChange={(e) => set('contactId', e.target.value ? Number(e.target.value) : null)}
            options={contactOptions.map((c) => ({ value: c.id, label: c.username ? `${c.name} (${c.username})` : c.name }))}
          />
        </Field>
      </div>

      {statusEditable && (
        <div className="props__submit">
          {changeCount > 0 && (
            <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={() => setDraft(original)} disabled={saving}>
              Undo
            </Button>
          )}
          <Button variant="primary" icon={<Send />} onClick={submit} loading={saving} disabled={changeCount === 0} block={changeCount === 0}>
            {changeCount === 0 ? 'Submit' : `Submit ${changeCount} change${changeCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      )}
    </div>
  );
}
