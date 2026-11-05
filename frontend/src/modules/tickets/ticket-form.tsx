import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TicketPlus } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { clientsOf, myClientProducts, productsOf, useLookups } from '@/modules/masters/use-lookups';
import { Button } from '@/shared/components/button';
import { Field } from '@/shared/components/form/field';
import { SelectInput } from '@/shared/components/form/select-input';
import { TextArea } from '@/shared/components/form/text-area';
import { TextInput } from '@/shared/components/form/text-input';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { FileDrop } from './components/file-drop';
import { ticketService } from './ticket.service';
import type { CreateTicketPayload } from './ticket.types';
import './tickets.css';

const EMPTY: CreateTicketPayload = {
  clientId: 0,
  productId: 0,
  moduleId: null,
  ticketTypeId: 0,
  subject: '',
  description: '',
  priorityId: 0,
  assignedToId: null,
};

const DESC_MIN = 10;

export default function TicketForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { lookups, error: lookupError } = useLookups();
  const { values, errors, setField, validate } = useFormState<CreateTicketPayload>(EMPTY);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  // the client products this user may raise tickets for (all of them for a super admin)
  const pairs = useMemo(() => myClientProducts(lookups, user), [lookups, user]);
  const clients = useMemo(() => clientsOf(pairs), [pairs]);
  const products = useMemo(() => productsOf(pairs.filter((cp) => cp.clientId === values.clientId)), [pairs, values.clientId]);
  const mapping = pairs.find((cp) => cp.clientId === values.clientId && cp.productId === values.productId);
  const priorities = useMemo(() => (lookups?.priorities ?? []).filter((p) => p.isActive), [lookups]);
  const ticketTypes = useMemo(() => (lookups?.ticketTypes ?? []).filter((t) => t.isActive), [lookups]);
  const modules = useMemo(
    () => (lookups?.modules ?? []).filter((m) => m.isActive && m.productId === values.productId),
    [lookups, values.productId],
  );
  // SLA for this client product: the agreed hours, or the Priority master hours
  const slaOf = (priorityId: number) => {
    const p = priorities.find((x) => x.id === priorityId);
    const agreed = mapping?.slas.find((x) => x.priorityId === priorityId);
    return { responseHrs: agreed?.responseHrs ?? p?.responseHrs ?? 0, resolveHrs: agreed?.resolveHrs ?? p?.resolveHrs ?? 0, agreed: !!agreed };
  };
  // employees on the chosen client product first, ordered by their role priority there
  const employees = useMemo(
    () =>
      (lookups?.employees ?? [])
        .filter((e) => e.isActive && e.role !== 'super_admin')
        .map((e) => ({
          ...e,
          level: e.assignments.find((a) => a.clientId === values.clientId && a.productId === values.productId)?.rolePriority,
        }))
        .sort((a, b) => (a.level ?? 99) - (b.level ?? 99) || a.name.localeCompare(b.name)),
    [lookups, values.clientId, values.productId],
  );

  // default priority and ticket type from the masters
  useEffect(() => {
    if (!values.priorityId && priorities.length) {
      setField('priorityId', (priorities.find((p) => p.isDefault) ?? priorities[0]).id);
    }
  }, [priorities, values.priorityId, setField]);
  useEffect(() => {
    if (!values.ticketTypeId && ticketTypes.length) {
      setField('ticketTypeId', (ticketTypes.find((t) => t.isDefault) ?? ticketTypes[0]).id);
    }
  }, [ticketTypes, values.ticketTypeId, setField]);

  const product = products.find((p) => p.id === values.productId);
  const priority = priorities.find((p) => p.id === values.priorityId);

  const chooseClient = (id: number) => {
    setField('clientId', id);
    setField('productId', 0);
    setField('moduleId', null);
  };
  const chooseProduct = (id: number) => {
    setField('productId', id);
    setField('moduleId', null);
  };

  // only one client / product available → fill it in
  useEffect(() => {
    if (clients.length === 1 && values.clientId !== clients[0].id) chooseClient(clients[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);
  useEffect(() => {
    if (products.length === 1 && values.productId !== products[0].id) chooseProduct(products[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // only one module for the product → fill it in
  useEffect(() => {
    if (modules.length === 1 && !values.moduleId) setField('moduleId', modules[0].id);
  }, [modules, values.moduleId, setField]);

  // Assign to: the employee whose role priority in this product matches the ticket priority
  // (Urgent/High → P1, Medium → P2, Low → P3), fewest open tickets first. Stops once picked by hand.
  const assigneeTouched = useRef(false);
  const suggestion = useMemo(() => {
    const target = priority?.assignRolePriority;
    const inOrg = employees.filter((e) => e.level !== undefined);
    if (!target || !inOrg.length) return null;
    const best = [...inOrg].sort(
      (a, b) =>
        Math.abs((a.level as number) - target) - Math.abs((b.level as number) - target) ||
        (a.level as number) - (b.level as number) ||
        (a.openTickets ?? 0) - (b.openTickets ?? 0),
    )[0];
    return { employee: best, exact: best.level === target, target };
  }, [employees, priority]);

  useEffect(() => {
    if (!assigneeTouched.current) setField('assignedToId', suggestion?.employee.id ?? null);
  }, [suggestion, setField]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({
      clientId: !v.clientId ? 'Choose the client' : undefined,
      productId: !v.productId ? 'Choose the product' : undefined,
      ticketTypeId: !v.ticketTypeId ? 'Choose the ticket type' : undefined,
      subject: !v.subject.trim() ? 'Write a one-line summary' : undefined,
      description: v.description.trim().length < DESC_MIN ? `Describe the issue in at least ${DESC_MIN} characters` : undefined,
      priorityId: !v.priorityId ? 'Choose a priority' : undefined,
    }));
    if (!ok) {
      toast.error('Some fields need attention');
      return;
    }

    setSaving(true);
    try {
      const ticket = await ticketService.create({
        ...values,
        subject: values.subject.trim(),
        description: values.description.trim(),
      });
      if (files.length) {
        try {
          await ticketService.uploadAttachments(ticket.id, files);
        } catch (err) {
          toast.error(`Ticket saved, but the files did not upload: ${errorMessage(err)}`);
        }
      }
      toast.success(`Ticket ${ticket.ticketNo} created`);
      navigate(`/tickets/${ticket.ticketNo}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="create-page page-enter" onSubmit={(e) => submit(e)} noValidate>
      <header className="create-head">
        <h1 className="create-head__title">
          <TicketPlus size={18} /> Create a ticket
        </h1>
        <div className="create-head__actions">
          <Button onClick={() => navigate('/tickets')} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" icon={<TicketPlus />} loading={saving}>
            Create ticket
          </Button>
        </div>
      </header>

      {lookupError && <div className="alert">{lookupError}</div>}
      {lookups && !pairs.length && (
        <div className="alert alert--warning">
          No client products yet. A super admin needs to map a product to a client in Masters › Client-Product Map first.
        </div>
      )}

      <div className="card create-grid">
        {/* left: what is affected and who handles it */}
        <section className="create-col create-col--side">
          <Field label="Client" htmlFor="t-client" required error={errors.clientId}>
            <SelectInput
              id="t-client"
              placeholder="Select Client"
              value={values.clientId || ''}
              disabled={clients.length === 1}
              invalid={!!errors.clientId}
              onChange={(e) => chooseClient(Number(e.target.value))}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
          <Field
            label="Product"
            htmlFor="t-product"
            required
            error={errors.productId}
            hint={!values.clientId ? 'Choose a client first' : undefined}
          >
            <SelectInput
              id="t-product"
              placeholder="Select Product"
              value={values.productId || ''}
              disabled={!values.clientId || products.length === 1}
              invalid={!!errors.productId}
              onChange={(e) => chooseProduct(Number(e.target.value))}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="Module" htmlFor="t-module" hint={!values.productId ? 'Choose a product first' : undefined}>
            <SelectInput
              id="t-module"
              placeholder={modules.length ? 'Select Module' : 'No Modules'}
              disabled={!values.productId || !modules.length}
              value={values.moduleId ?? ''}
              onChange={(e) => setField('moduleId', e.target.value ? Number(e.target.value) : null)}
              options={modules.map((m) => ({ value: m.id, label: m.name }))}
            />
          </Field>
          <Field label="Ticket type" htmlFor="t-type" required error={errors.ticketTypeId}>
            <SelectInput
              id="t-type"
              value={values.ticketTypeId || ''}
              invalid={!!errors.ticketTypeId}
              onChange={(e) => setField('ticketTypeId', Number(e.target.value))}
              options={ticketTypes.map((t) => ({ value: t.id, label: t.name }))}
            />
          </Field>
          <Field
            label="Priority"
            htmlFor="t-priority"
            required
            error={errors.priorityId}
            hint={mapping && priority && slaOf(priority.id).agreed ? `SLA agreed with ${mapping.client.name}` : undefined}
          >
            <SelectInput
              id="t-priority"
              value={values.priorityId || ''}
              invalid={!!errors.priorityId}
              onChange={(e) => setField('priorityId', Number(e.target.value))}
              options={priorities.map((p) => ({ value: p.id, label: `${p.name} · resolve in ${slaOf(p.id).resolveHrs}h` }))}
            />
          </Field>
          <Field
            label="Assign to"
            htmlFor="t-assignee"
            hint={
              suggestion && values.assignedToId === suggestion.employee.id
                ? `Suggested: P${suggestion.employee.level} on ${product?.name ?? 'this product'}${
                    suggestion.exact ? ` takes ${priority?.name}` : ` (no P${suggestion.target} employee yet)`
                  }`
                : 'Optional. Employees of the chosen client product first, by role priority.'
            }
          >
            <SelectInput
              id="t-assignee"
              placeholder="Select Employee"
              value={values.assignedToId ?? ''}
              onChange={(e) => {
                assigneeTouched.current = true;
                setField('assignedToId', e.target.value ? Number(e.target.value) : null);
              }}
              options={employees.map((e) => ({
                value: e.id,
                label: e.level ? `${e.name} · ${product?.name} P${e.level}` : e.name,
              }))}
            />
          </Field>
        </section>

        {/* right: the issue itself */}
        <section className="create-col create-col--main">
          <Field label="Subject" htmlFor="t-subject" required error={errors.subject}>
            <TextInput
              id="t-subject"
              placeholder="Enter Subject"
              value={values.subject}
              maxLength={200}
              invalid={!!errors.subject}
              onChange={(e) => setField('subject', e.target.value)}
            />
          </Field>
          <Field
            label="Issue / description"
            htmlFor="t-description"
            required
            error={errors.description}
            className="create-desc"
            hint={
              <span className="char-count">
                {values.description.trim().length < DESC_MIN
                  ? `${DESC_MIN - values.description.trim().length} more characters needed`
                  : `${values.description.length} characters`}
              </span>
            }
          >
            <TextArea
              id="t-description"
              placeholder="Enter Issue Description"
              value={values.description}
              invalid={!!errors.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </Field>
          <Field label="Attachments">
            <FileDrop files={files} onChange={setFiles} onReject={toast.error} />
          </Field>
        </section>
      </div>
    </form>
  );
}
