import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Drawer } from '@/shared/components/drawer';
import { ColorInput } from '@/shared/components/form/color-input';
import { Field } from '@/shared/components/form/field';
import { TextArea } from '@/shared/components/form/text-area';
import { TextInput } from '@/shared/components/form/text-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { ticketTypeService } from './ticket-type.service';
import type { TicketType, TicketTypePayload } from './ticket-type.types';

interface TicketTypeFormProps {
  open: boolean;
  item: TicketType | null;
  onClose: () => void;
  onSaved: (type: TicketType) => void;
}

const EMPTY: TicketTypePayload = {
  name: '',
  description: null,
  color: '#3b6fe0',
  isDefault: false,
  sortOrder: 0,
  isActive: true,
};

export function TicketTypeForm({ open, item, onClose, onSaved }: TicketTypeFormProps) {
  const toast = useToast();
  const { values, errors, setField, reset, validate } = useFormState<TicketTypePayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            name: item.name,
            description: item.description,
            color: item.color,
            isDefault: item.isDefault,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : EMPTY,
    );
  }, [open, item, reset]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({ name: !v.name.trim() ? 'Enter a ticket type name' : undefined }));
    if (!ok) return;

    setSaving(true);
    try {
      const payload = { ...values, name: values.name.trim() };
      const saved = item ? await ticketTypeService.update(item.id, payload) : await ticketTypeService.create(payload);
      toast.success(item ? `${payload.name} updated` : `${payload.name} added`);
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
      eyebrow={item ? 'Edit ticket type' : 'New ticket type'}
      title={item ? item.name : 'Add a ticket type'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="ticket-type-form" loading={saving}>
            {item ? 'Save changes' : 'Add ticket type'}
          </Button>
        </>
      }
    >
      <form id="ticket-type-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Ticket type name" htmlFor="tt-name" required error={errors.name}>
          <TextInput
            id="tt-name"
            placeholder="Enter Ticket Type Name"
            value={values.name}
            maxLength={50}
            invalid={!!errors.name}
            onChange={(e) => setField('name', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Display order" htmlFor="tt-order">
          <TextInput
            id="tt-order"
            placeholder="Enter Display Order"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(e) => setField('sortOrder', Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <Field label="Description" htmlFor="tt-desc" className="span-all" hint="Helps people pick the right type">
          <TextArea
            id="tt-desc"
            placeholder="Enter Description"
            rows={3}
            style={{ minHeight: 84 }}
            value={values.description ?? ''}
            onChange={(e) => setField('description', e.target.value || null)}
          />
        </Field>
        <Field label="Colour" htmlFor="tt-color" className="span-all">
          <ColorInput id="tt-color" value={values.color} onChange={(c) => setField('color', c)} />
        </Field>
        <div className="span-all preview-chip-row">
          Preview <Chip color={values.color}>{values.name || 'Ticket type'}</Chip>
        </div>
        <div className="span-all" style={{ display: 'grid', gap: 14 }}>
          <ToggleSwitch
            id="tt-default"
            checked={values.isDefault}
            onChange={(v) => setField('isDefault', v)}
            disabled={item?.isDefault}
            label="Default for new tickets and the HelpX widget"
          />
          <ToggleSwitch
            id="tt-active"
            checked={values.isActive}
            onChange={(v) => setField('isActive', v)}
            disabled={item?.isDefault}
            label={values.isActive ? 'Active' : 'Inactive — hidden from Create Ticket'}
          />
        </div>
      </form>
    </Drawer>
  );
}
