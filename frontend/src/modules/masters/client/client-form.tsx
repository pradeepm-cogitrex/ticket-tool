import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/shared/components/button';
import { Drawer } from '@/shared/components/drawer';
import { Field } from '@/shared/components/form/field';
import { TextArea } from '@/shared/components/form/text-area';
import { TextInput } from '@/shared/components/form/text-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { clientService } from './client.service';
import type { Client, ClientPayload } from './client.types';

interface ClientFormProps {
  open: boolean;
  item: Client | null;
  onClose: () => void;
  onSaved: (client: Client) => void;
}

const EMPTY: ClientPayload = {
  code: '',
  name: '',
  description: null,
  contactEmail: null,
  contactPhone: null,
  sortOrder: 0,
  isActive: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClientForm({ open, item, onClose, onSaved }: ClientFormProps) {
  const toast = useToast();
  const { values, errors, setField, reset, validate } = useFormState<ClientPayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            code: item.code,
            name: item.name,
            description: item.description,
            contactEmail: item.contactEmail,
            contactPhone: item.contactPhone,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : EMPTY,
    );
  }, [open, item, reset]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({
      code: !v.code.trim() ? 'Enter a short code, e.g. SAKKU' : !/^[A-Za-z0-9]+$/.test(v.code) ? 'Use letters and numbers only' : undefined,
      name: !v.name.trim() ? 'Enter the client name' : undefined,
      contactEmail: v.contactEmail && !EMAIL_RE.test(v.contactEmail.trim()) ? 'Enter a valid email address' : undefined,
      contactPhone: v.contactPhone && !/^[0-9+\-\s]{6,20}$/.test(v.contactPhone) ? 'Use digits, spaces, + or - only' : undefined,
    }));
    if (!ok) return;

    setSaving(true);
    try {
      const payload = { ...values, code: values.code.trim().toUpperCase(), name: values.name.trim() };
      const saved = item ? await clientService.update(item.id, payload) : await clientService.create(payload);
      toast.success(item ? `${payload.name} updated` : `${payload.name} added to clients`);
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={item ? 'Edit client' : 'New client'}
      title={item ? item.name : 'Add a client'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="client-form" loading={saving}>
            {item ? 'Save changes' : 'Add client'}
          </Button>
        </>
      }
    >
      <form id="client-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Client code" htmlFor="cl-code" required error={errors.code} hint="Up to 10 letters or numbers. Used in ticket numbers.">
          <TextInput
            id="cl-code"
            placeholder="Enter Client Code"
            className="mono"
            value={values.code}
            maxLength={10}
            invalid={!!errors.code}
            onChange={(e) => setField('code', e.target.value.toUpperCase())}
            autoFocus
          />
        </Field>
        <Field label="Client name" htmlFor="cl-name" required error={errors.name}>
          <TextInput
            id="cl-name"
            placeholder="Enter Client Name"
            value={values.name}
            maxLength={100}
            invalid={!!errors.name}
            onChange={(e) => setField('name', e.target.value)}
          />
        </Field>
        <div className="span-all field__hint">
          Ticket numbers will look like <span className="mono">TKT-{values.code || 'CLIENT'}-HRMS-{new Date().toLocaleDateString('en-GB', { month: '2-digit', year: '2-digit' })}/00001</span>
        </div>
        <Field label="Contact email" htmlFor="cl-email" error={errors.contactEmail}>
          <TextInput
            id="cl-email"
            placeholder="Enter Contact Email"
            type="email"
            value={values.contactEmail ?? ''}
            maxLength={150}
            invalid={!!errors.contactEmail}
            onChange={(e) => setField('contactEmail', e.target.value || null)}
          />
        </Field>
        <Field label="Contact phone" htmlFor="cl-phone" error={errors.contactPhone}>
          <TextInput
            id="cl-phone"
            placeholder="Enter Contact Phone"
            value={values.contactPhone ?? ''}
            maxLength={20}
            invalid={!!errors.contactPhone}
            onChange={(e) => setField('contactPhone', e.target.value || null)}
          />
        </Field>
        <Field label="Description" htmlFor="cl-desc" className="span-all">
          <TextArea
            id="cl-desc"
            placeholder="Enter Description"
            rows={3}
            style={{ minHeight: 90 }}
            value={values.description ?? ''}
            onChange={(e) => setField('description', e.target.value || null)}
          />
        </Field>
        <Field label="Display order" htmlFor="cl-order" hint="Lower numbers show first">
          <TextInput
            id="cl-order"
            placeholder="Enter Display Order"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(e) => setField('sortOrder', Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <div className="span-all">
          <ToggleSwitch
            id="cl-active"
            checked={values.isActive}
            onChange={(v) => setField('isActive', v)}
            label={values.isActive ? 'Active — shown when creating tickets' : 'Inactive — hidden from Create Ticket'}
          />
        </div>
      </form>
    </Drawer>
  );
}
