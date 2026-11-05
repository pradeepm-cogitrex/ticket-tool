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
import { productService } from './product.service';
import type { Product, ProductPayload } from './product.types';

interface ProductFormProps {
  open: boolean;
  item: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const EMPTY: ProductPayload = { code: '', name: '', description: null, sortOrder: 0, isActive: true };

export function ProductForm({ open, item, onClose, onSaved }: ProductFormProps) {
  const toast = useToast();
  const { values, errors, setField, reset, validate } = useFormState<ProductPayload>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            code: item.code,
            name: item.name,
            description: item.description,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : EMPTY,
    );
  }, [open, item, reset]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({
      code: !v.code.trim() ? 'Enter a short code, e.g. HRMS' : !/^[A-Za-z0-9_-]+$/.test(v.code) ? 'Use letters, numbers, - or _ only' : undefined,
      name: !v.name.trim() ? 'Enter the product name' : undefined,
    }));
    if (!ok) return;

    setSaving(true);
    try {
      const payload = { ...values, code: values.code.trim().toUpperCase(), name: values.name.trim() };
      const saved = item ? await productService.update(item.id, payload) : await productService.create(payload);
      toast.success(item ? `${payload.name} updated` : `${payload.name} added to products`);
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
      eyebrow={item ? 'Edit product' : 'New product'}
      title={item ? item.name : 'Add a product'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="product-form" loading={saving}>
            {item ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="product-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Product code" htmlFor="p-code" required error={errors.code} hint="Short and unique, e.g. HRMS">
          <TextInput
            id="p-code" placeholder="Enter Product Code"
            className="mono"
            value={values.code}
            maxLength={20}
            invalid={!!errors.code}
            onChange={(e) => setField('code', e.target.value.toUpperCase())}
            autoFocus
          />
        </Field>
        <Field label="Product name" htmlFor="p-name" required error={errors.name} hint="Shown in the Product dropdown">
          <TextInput
            id="p-name" placeholder="Enter Product Name"
            value={values.name}
            maxLength={100}
            invalid={!!errors.name}
            onChange={(e) => setField('name', e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="p-desc" className="span-all">
          <TextArea
            id="p-desc" placeholder="Enter Description"
            rows={3}
            style={{ minHeight: 90 }}
            value={values.description ?? ''}
            onChange={(e) => setField('description', e.target.value || null)}
          />
        </Field>
        <Field label="Display order" htmlFor="p-order" hint="Lower numbers show first">
          <TextInput
            id="p-order" placeholder="Enter Display Order"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(e) => setField('sortOrder', Math.max(0, Number(e.target.value) || 0))}
          />
        </Field>
        <div className="span-all">
          <ToggleSwitch
            id="p-active"
            checked={values.isActive}
            onChange={(v) => setField('isActive', v)}
            label={values.isActive ? 'Active — shown when creating tickets' : 'Inactive — hidden from Create Ticket'}
          />
        </div>
      </form>
    </Drawer>
  );
}
