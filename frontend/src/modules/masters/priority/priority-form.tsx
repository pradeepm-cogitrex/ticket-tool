import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Drawer } from '@/shared/components/drawer';
import { ColorInput } from '@/shared/components/form/color-input';
import { Field } from '@/shared/components/form/field';
import { SelectInput } from '@/shared/components/form/select-input';
import { TextInput } from '@/shared/components/form/text-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { priorityService } from './priority.service';
import type { Priority, PriorityPayload } from './priority.types';

interface PriorityFormProps {
  open: boolean;
  item: Priority | null;
  onClose: () => void;
  onSaved: (priority: Priority) => void;
}

const EMPTY: PriorityPayload = {
  name: '',
  responseHrs: 4,
  resolveHrs: 24,
  assignRolePriority: 2,
  color: '#f76b15',
  isDefault: false,
  sortOrder: 0,
  isActive: true,
};

export function PriorityForm({ open, item, onClose, onSaved }: PriorityFormProps) {
  const toast = useToast();
  const { values, errors, setField, reset, validate } = useFormState<PriorityPayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            name: item.name,
            responseHrs: item.responseHrs,
            resolveHrs: item.resolveHrs,
            assignRolePriority: item.assignRolePriority,
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
    const ok = validate((v) => ({
      name: !v.name.trim() ? 'Enter a priority name' : undefined,
      responseHrs: v.responseHrs < 1 ? 'At least 1 hour' : undefined,
      resolveHrs: v.resolveHrs < 1 ? 'At least 1 hour' : v.resolveHrs < v.responseHrs ? 'Must be at least the response time' : undefined,
    }));
    if (!ok) return;

    setSaving(true);
    try {
      const payload = { ...values, name: values.name.trim() };
      const saved = item ? await priorityService.update(item.id, payload) : await priorityService.create(payload);
      toast.success(item ? `${payload.name} updated` : `${payload.name} priority added`);
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const hours = (key: 'responseHrs' | 'resolveHrs') => (e: ChangeEvent<HTMLInputElement>) =>
    setField(key, Math.max(0, Math.round(Number(e.target.value) || 0)));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={item ? 'Edit priority' : 'New priority'}
      title={item ? item.name : 'Add a priority'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="priority-form" loading={saving}>
            {item ? 'Save changes' : 'Add priority'}
          </Button>
        </>
      }
    >
      <form id="priority-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Priority name" htmlFor="pr-name" required error={errors.name}>
          <TextInput
            id="pr-name" placeholder="Enter Priority Name"
            value={values.name}
            maxLength={50}
            invalid={!!errors.name}
            onChange={(e) => setField('name', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Display order" htmlFor="pr-order">
          <TextInput id="pr-order" placeholder="Enter Display Order" type="number" min={0} value={values.sortOrder} onChange={(e) => setField('sortOrder', Math.max(0, Number(e.target.value) || 0))} />
        </Field>

        <div className="form-section-title">SLA targets</div>
        <Field label="First response (hours)" htmlFor="pr-resp" required error={errors.responseHrs} hint="Time allowed until the first reply">
          <TextInput id="pr-resp" placeholder="Enter First Response Hours" type="number" min={1} value={values.responseHrs} invalid={!!errors.responseHrs} onChange={hours('responseHrs')} />
        </Field>
        <Field label="Resolution (hours)" htmlFor="pr-res" required error={errors.resolveHrs} hint="Sets the ticket due date">
          <TextInput id="pr-res" placeholder="Enter Resolution Hours" type="number" min={1} value={values.resolveHrs} invalid={!!errors.resolveHrs} onChange={hours('resolveHrs')} />
        </Field>

        <div className="form-section-title">Auto-assign</div>
        <Field
          label="Assign to role priority"
          htmlFor="pr-level"
          className="span-all"
          hint="Tickets of this priority go to employees with this role priority in the ticket's organization. 1 is the most senior."
        >
          <SelectInput
            id="pr-level"
            value={values.assignRolePriority}
            onChange={(e) => setField('assignRolePriority', Number(e.target.value))}
            options={Array.from({ length: 9 }, (_, i) => ({ value: i + 1, label: `P${i + 1}${i === 0 ? ' · most senior' : ''}` }))}
          />
        </Field>

        <Field label="Colour" htmlFor="pr-color" className="span-all">
          <ColorInput id="pr-color" value={values.color} onChange={(c) => setField('color', c)} />
        </Field>
        <div className="span-all preview-chip-row">
          Preview <Chip color={values.color}>{values.name || 'Priority'}</Chip>
        </div>

        <div className="span-all" style={{ display: 'grid', gap: 14 }}>
          <ToggleSwitch
            id="pr-default"
            checked={values.isDefault}
            onChange={(v) => setField('isDefault', v)}
            disabled={item?.isDefault}
            label="Default for new tickets"
          />
          <ToggleSwitch
            id="pr-active"
            checked={values.isActive}
            onChange={(v) => setField('isActive', v)}
            disabled={item?.isDefault}
            label={values.isActive ? 'Active' : 'Inactive'}
          />
        </div>
      </form>
    </Drawer>
  );
}
