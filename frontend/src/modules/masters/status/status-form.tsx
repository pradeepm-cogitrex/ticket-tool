import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Drawer } from '@/shared/components/drawer';
import { ColorInput } from '@/shared/components/form/color-input';
import { Field } from '@/shared/components/form/field';
import { TextInput } from '@/shared/components/form/text-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { Segmented } from '@/shared/components/segmented';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { statusService } from './status.service';
import type { Status, StatusPayload, StatusType } from './status.types';

interface StatusFormProps {
  open: boolean;
  item: Status | null;
  onClose: () => void;
  onSaved: (status: Status) => void;
}

const EMPTY: StatusPayload = {
  name: '',
  type: 'open',
  pausesSla: false,
  requiresNote: false,
  locksTicket: false,
  isDefault: false,
  color: '#3b6fe0',
  sortOrder: 0,
  isActive: true,
};

export function StatusForm({ open, item, onClose, onSaved }: StatusFormProps) {
  const toast = useToast();
  const { values, errors, setField, reset, validate } = useFormState<StatusPayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            name: item.name,
            type: item.type,
            pausesSla: item.pausesSla,
            requiresNote: item.requiresNote,
            locksTicket: item.locksTicket,
            isDefault: item.isDefault,
            color: item.color,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : EMPTY,
    );
  }, [open, item, reset]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({
      name: !v.name.trim() ? 'Enter a status name' : undefined,
      isDefault: v.isDefault && v.type !== 'open' ? 'The default status must be an open-type status' : undefined,
    }));
    if (!ok) return;

    setSaving(true);
    try {
      const payload = { ...values, name: values.name.trim() };
      const saved = item ? await statusService.update(item.id, payload) : await statusService.create(payload);
      toast.success(item ? `${payload.name} updated` : `${payload.name} status added`);
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
      eyebrow={item ? 'Edit status' : 'New status'}
      title={item ? item.name : 'Add a status'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="status-form" loading={saving}>
            {item ? 'Save changes' : 'Add status'}
          </Button>
        </>
      }
    >
      <form id="status-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Status name" htmlFor="s-name" required error={errors.name}>
          <TextInput
            id="s-name" placeholder="Enter Status Name"
            value={values.name}
            maxLength={50}
            invalid={!!errors.name}
            onChange={(e) => setField('name', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Order in workflow" htmlFor="s-order">
          <TextInput id="s-order" placeholder="Enter Workflow Order" type="number" min={0} value={values.sortOrder} onChange={(e) => setField('sortOrder', Math.max(0, Number(e.target.value) || 0))} />
        </Field>

        <Field
          label="Type"
          required
          className="span-all"
          error={errors.isDefault}
          hint={values.type === 'open' ? 'Open: the ticket is still being worked on and the SLA clock runs.' : 'Closed: work is finished; the resolved date is recorded.'}
        >
          <div>
            <Segmented<StatusType>
              ariaLabel="Status type"
              value={values.type}
              onChange={(v) => setField('type', v)}
              options={[
                { value: 'open', label: 'Open-type' },
                { value: 'closed', label: 'Closed-type' },
              ]}
            />
          </div>
        </Field>

        <Field label="Colour" htmlFor="s-color" className="span-all">
          <ColorInput id="s-color" value={values.color} onChange={(c) => setField('color', c)} />
        </Field>
        <div className="span-all preview-chip-row">
          Preview <Chip color={values.color}>{values.name || 'Status'}</Chip>
        </div>

        <div className="span-all" style={{ display: 'grid', gap: 14 }}>
          <ToggleSwitch id="s-pause" checked={values.pausesSla} onChange={(v) => setField('pausesSla', v)} label="Pause the SLA clock in this status" />
          <ToggleSwitch id="s-note" checked={values.requiresNote} onChange={(v) => setField('requiresNote', v)} label="Require a resolution note to move here" />
          <ToggleSwitch
            id="s-lock"
            checked={values.locksTicket}
            onChange={(v) => setField('locksTicket', v)}
            label="Final status — lock the ticket (no more replies or changes)"
          />
          <ToggleSwitch
            id="s-default"
            checked={values.isDefault}
            onChange={(v) => setField('isDefault', v)}
            disabled={item?.isDefault}
            label="New tickets start in this status"
          />
          <ToggleSwitch
            id="s-active"
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
