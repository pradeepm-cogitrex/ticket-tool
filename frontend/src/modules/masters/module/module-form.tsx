import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/shared/components/button';
import { Drawer } from '@/shared/components/drawer';
import { Field } from '@/shared/components/form/field';
import { SelectInput } from '@/shared/components/form/select-input';
import { TextArea } from '@/shared/components/form/text-area';
import { TextInput } from '@/shared/components/form/text-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { useLookups } from '../use-lookups';
import { moduleService } from './module.service';
import type { ModuleMaster, ModulePayload } from './module.types';

interface ModuleFormProps {
  open: boolean;
  item: ModuleMaster | null;
  defaultProductId?: number;
  onClose: () => void;
  onSaved: (module: ModuleMaster) => void;
}

export function ModuleForm({ open, item, defaultProductId, onClose, onSaved }: ModuleFormProps) {
  const toast = useToast();
  const { lookups } = useLookups();
  const { values, errors, setField, reset, validate } = useFormState<ModulePayload>({
    productId: 0,
    name: '',
    description: null,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? { productId: item.productId, name: item.name, description: item.description, isActive: item.isActive }
        : { productId: defaultProductId ?? 0, name: '', description: null, isActive: true },
    );
  }, [open, item, defaultProductId, reset]);

  const products = (lookups?.products ?? []).filter((p) => p.isActive || p.id === values.productId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({
      productId: !v.productId ? 'Choose the product this module belongs to' : undefined,
      name: !v.name.trim() ? 'Enter a module name' : undefined,
    }));
    if (!ok) return;

    setSaving(true);
    try {
      const payload = { ...values, name: values.name.trim() };
      const saved = item ? await moduleService.update(item.id, payload) : await moduleService.create(payload);
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
      eyebrow={item ? 'Edit module' : 'New module'}
      title={item ? item.name : 'Add a module'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="module-form" loading={saving}>
            {item ? 'Save changes' : 'Add module'}
          </Button>
        </>
      }
    >
      <form id="module-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Product" htmlFor="c-product" required error={errors.productId} hint="The Module dropdown only lists modules of the chosen product">
          <SelectInput
            id="c-product" placeholder="Select Product"
            value={values.productId || ''}
            invalid={!!errors.productId}
            onChange={(e) => setField('productId', Number(e.target.value))}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
          />
        </Field>
        <Field label="Module name" htmlFor="c-name" required error={errors.name}>
          <TextInput
            id="c-name" placeholder="Enter Module Name"
            value={values.name}
            maxLength={100}
            invalid={!!errors.name}
            onChange={(e) => setField('name', e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Description" htmlFor="c-desc" className="span-all">
          <TextArea
            id="c-desc" placeholder="Enter Description"
            rows={3}
            style={{ minHeight: 90 }}
            value={values.description ?? ''}
            onChange={(e) => setField('description', e.target.value || null)}
          />
        </Field>
        <div className="span-all">
          <ToggleSwitch
            id="c-active"
            checked={values.isActive}
            onChange={(v) => setField('isActive', v)}
            label={values.isActive ? 'Active' : 'Inactive — hidden from Create Ticket'}
          />
        </div>
      </form>
    </Drawer>
  );
}
