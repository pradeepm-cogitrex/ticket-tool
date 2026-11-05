import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/shared/components/button';
import { Drawer } from '@/shared/components/drawer';
import { Field } from '@/shared/components/form/field';
import { SelectInput } from '@/shared/components/form/select-input';
import { TextInput } from '@/shared/components/form/text-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { pairLabel } from '../client-product/client-product.types';
import { useLookups } from '../use-lookups';
import { contactService } from './contact.service';
import type { Contact, ContactPayload } from './contact.types';

interface ContactFormProps {
  open: boolean;
  item: Contact | null;
  /** client product picked in the list filter, used for a new contact */
  defaultPair?: { clientId: number; productId: number };
  onClose: () => void;
  onSaved: (contact: Contact) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const empty = (pair?: { clientId: number; productId: number }): ContactPayload => ({
  clientId: pair?.clientId ?? 0,
  productId: pair?.productId ?? 0,
  name: '',
  username: null,
  email: null,
  phone: null,
  isActive: true,
});

export function ContactForm({ open, item, defaultPair, onClose, onSaved }: ContactFormProps) {
  const toast = useToast();
  const { lookups } = useLookups();
  const { values, errors, setField, reset, validate } = useFormState<ContactPayload>(empty());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            clientId: item.clientId,
            productId: item.productId,
            name: item.name,
            username: item.username,
            email: item.email,
            phone: item.phone,
            isActive: item.isActive,
          }
        : empty(defaultPair),
    );
  }, [open, item, defaultPair, reset]);

  const pairs = (lookups?.clientProducts ?? []).filter(
    (cp) => cp.isActive || (cp.clientId === values.clientId && cp.productId === values.productId),
  );
  const selectedPair = pairs.find((cp) => cp.clientId === values.clientId && cp.productId === values.productId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({
      clientId: !v.clientId || !v.productId ? 'Choose the client and product' : undefined,
      name: !v.name.trim() ? 'Enter the name' : undefined,
      email:
        v.email && !EMAIL_RE.test(v.email.trim())
          ? 'Enter a valid email address'
          : !v.email?.trim() && !v.phone?.trim()
            ? 'Enter an email or a WhatsApp number'
            : undefined,
      phone: v.phone && !/^[0-9+\-\s]{8,20}$/.test(v.phone) ? 'Use digits with country code, e.g. 919876543210' : undefined,
    }));
    if (!ok) return;

    setSaving(true);
    try {
      const payload: ContactPayload = {
        ...values,
        name: values.name.trim(),
        username: values.username?.trim() || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
      };
      const saved = item ? await contactService.update(item.id, payload) : await contactService.create(payload);
      toast.success(item ? `${payload.name} updated` : `${payload.name} added to user contacts`);
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
      eyebrow={item ? 'Edit user contact' : 'New user contact'}
      title={item ? item.name : 'Add a user contact'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="contact-form" loading={saving}>
            {item ? 'Save changes' : 'Add contact'}
          </Button>
        </>
      }
    >
      <form id="contact-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Client product" htmlFor="ct-pair" required error={errors.clientId} className="span-all">
          <SelectInput
            id="ct-pair"
            placeholder="Select Client Product"
            value={selectedPair?.id ?? ''}
            invalid={!!errors.clientId}
            onChange={(e) => {
              const cp = pairs.find((p) => p.id === Number(e.target.value));
              setField('productId', cp?.productId ?? 0);
              setField('clientId', cp?.clientId ?? 0);
            }}
            options={pairs.map((cp) => ({ value: cp.id, label: pairLabel(cp) }))}
            autoFocus={!item}
          />
        </Field>
        <Field label="Name" htmlFor="ct-name" required error={errors.name}>
          <TextInput
            id="ct-name"
            placeholder="Enter Name"
            value={values.name}
            maxLength={100}
            invalid={!!errors.name}
            onChange={(e) => setField('name', e.target.value)}
          />
        </Field>
        <Field
          label="Username"
          htmlFor="ct-username"
          error={errors.username}
          hint="Their login in the product. Tickets raised with it are linked to this contact."
        >
          <TextInput
            id="ct-username"
            placeholder="Enter Username"
            value={values.username ?? ''}
            maxLength={100}
            onChange={(e) => setField('username', e.target.value || null)}
          />
        </Field>
        <Field label="Email" htmlFor="ct-email" error={errors.email}>
          <TextInput
            id="ct-email"
            placeholder="Enter Email"
            type="email"
            value={values.email ?? ''}
            maxLength={150}
            invalid={!!errors.email}
            onChange={(e) => setField('email', e.target.value || null)}
          />
        </Field>
        <Field label="WhatsApp number" htmlFor="ct-phone" error={errors.phone} hint="With country code, e.g. 919876543210">
          <TextInput
            id="ct-phone"
            placeholder="Enter Number"
            inputMode="tel"
            value={values.phone ?? ''}
            maxLength={20}
            invalid={!!errors.phone}
            onChange={(e) => setField('phone', e.target.value || null)}
          />
        </Field>
        <div className="span-all">
          <ToggleSwitch
            id="ct-active"
            checked={values.isActive}
            onChange={(v) => setField('isActive', v)}
            label={values.isActive ? 'Active — can be informed about tickets' : 'Inactive — not linked or informed'}
          />
        </div>
      </form>
    </Drawer>
  );
}
