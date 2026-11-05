import { FormEvent, useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { Drawer } from '@/shared/components/drawer';
import { Field } from '@/shared/components/form/field';
import { SelectInput } from '@/shared/components/form/select-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { useToast } from '@/shared/context/toast-context';
import { errorMessage } from '@/shared/services/api.service';
import { useLookups } from '../use-lookups';
import { clientProductService } from './client-product.service';
import type { ClientProduct } from './client-product.types';

interface ClientProductFormProps {
  open: boolean;
  item: ClientProduct | null;
  defaultClientId?: number;
  defaultProductId?: number;
  onClose: () => void;
  onSaved: (mapping: ClientProduct) => void;
}

/** Hours typed for one priority; empty strings = use the Priority master hours. */
type SlaDraft = Record<number, { responseHrs: string; resolveHrs: string }>;

const toHours = (v: string) => (v.trim() === '' ? null : Math.round(Number(v)));

export function ClientProductForm({ open, item, defaultClientId, defaultProductId, onClose, onSaved }: ClientProductFormProps) {
  const toast = useToast();
  const { lookups } = useLookups();
  const [clientId, setClientId] = useState(0);
  const [productId, setProductId] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [sla, setSla] = useState<SlaDraft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setClientId(item?.clientId ?? defaultClientId ?? 0);
    setProductId(item?.productId ?? defaultProductId ?? 0);
    setIsActive(item?.isActive ?? true);
    setSla(
      Object.fromEntries(
        (item?.slas ?? []).map((s) => [s.priorityId, { responseHrs: String(s.responseHrs), resolveHrs: String(s.resolveHrs) }]),
      ),
    );
  }, [open, item, defaultClientId, defaultProductId]);

  const clients = (lookups?.clients ?? []).filter((c) => c.isActive || c.id === clientId);
  const taken = useMemo(
    () => new Set((lookups?.clientProducts ?? []).filter((cp) => cp.clientId === clientId && cp.id !== item?.id).map((cp) => cp.productId)),
    [lookups, clientId, item],
  );
  const products = (lookups?.products ?? []).filter((p) => (p.isActive && !taken.has(p.id)) || p.id === productId);
  const priorities = (lookups?.priorities ?? []).filter((p) => p.isActive || sla[p.id]);

  const setHours = (priorityId: number, key: 'responseHrs' | 'resolveHrs', value: string) => {
    setSla((d) => ({
      ...d,
      [priorityId]: { ...(d[priorityId] ?? { responseHrs: '', resolveHrs: '' }), [key]: value.replace(/[^0-9]/g, '') },
    }));
    setErrors((e) => ({ ...e, [`sla-${priorityId}`]: '' }));
  };

  const clearRow = (priorityId: number) =>
    setSla((d) => {
      const next = { ...d };
      delete next[priorityId];
      return next;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!clientId) next.clientId = 'Choose the client';
    if (!productId) next.productId = 'Choose the product';

    const slas = priorities
      .map((p) => {
        const row = sla[p.id];
        const responseHrs = row ? toHours(row.responseHrs) : null;
        const resolveHrs = row ? toHours(row.resolveHrs) : null;
        if (responseHrs === null && resolveHrs === null) return null;
        if (responseHrs === null || resolveHrs === null) next[`sla-${p.id}`] = 'Fill in both, or clear the row';
        else if (responseHrs < 1 || resolveHrs < 1) next[`sla-${p.id}`] = 'At least 1 hour';
        else if (resolveHrs < responseHrs) next[`sla-${p.id}`] = 'Resolution must be at least the response time';
        return { priorityId: p.id, responseHrs: responseHrs ?? 0, resolveHrs: resolveHrs ?? 0 };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setSaving(true);
    try {
      const saved = item
        ? await clientProductService.update(item.id, { slas, isActive })
        : await clientProductService.create({ clientId, productId, slas, isActive });
      const label = `${saved.product.name} for ${saved.client.name}`;
      toast.success(item ? `${label} updated` : `${label} mapped`);
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
      eyebrow={item ? 'Edit client product' : 'Map a product to a client'}
      title={item ? `${item.client.name} · ${item.product.name}` : 'Client product & SLA'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="client-product-form" loading={saving}>
            {item ? 'Save changes' : 'Map product'}
          </Button>
        </>
      }
    >
      <form id="client-product-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Client" htmlFor="cp-client" required error={errors.clientId} hint={item ? 'Fixed once mapped' : undefined}>
          <SelectInput
            id="cp-client"
            placeholder="Select Client"
            value={clientId || ''}
            disabled={!!item}
            invalid={!!errors.clientId}
            onChange={(e) => {
              setClientId(Number(e.target.value));
              setErrors((x) => ({ ...x, clientId: '' }));
            }}
            options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
          />
        </Field>
        <Field
          label="Product"
          htmlFor="cp-product"
          required
          error={errors.productId}
          hint={item ? 'Fixed once mapped' : clientId && !products.length ? 'Every product is already mapped to this client' : undefined}
        >
          <SelectInput
            id="cp-product"
            placeholder="Select Product"
            value={productId || ''}
            disabled={!!item}
            invalid={!!errors.productId}
            onChange={(e) => {
              setProductId(Number(e.target.value));
              setErrors((x) => ({ ...x, productId: '' }));
            }}
            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
          />
        </Field>

        <div className="form-section-title">SLA timings</div>
        <p className="span-all field__hint" style={{ marginTop: -6 }}>
          Hours agreed with this client for this product. Leave a row empty to use the hours from Masters › Priority &amp; SLA.
        </p>
        <div className="span-all">
          <table className="sla-grid">
            <thead>
              <tr>
                <th>Priority</th>
                <th>First response (h)</th>
                <th>Resolution (h)</th>
                <th aria-label="Reset" />
              </tr>
            </thead>
            <tbody>
              {priorities.map((p) => {
                const row = sla[p.id];
                const custom = !!row && (row.responseHrs !== '' || row.resolveHrs !== '');
                const error = errors[`sla-${p.id}`];
                return (
                  <tr key={p.id} className={custom ? 'is-custom' : undefined}>
                    <td>
                      <Chip color={p.color}>{p.name}</Chip>
                      {error && <div className="field__error">{error}</div>}
                    </td>
                    <td>
                      <input
                        className={`input sla-grid__input${error ? ' input--error' : ''}`}
                        inputMode="numeric"
                        placeholder={String(p.responseHrs)}
                        aria-label={`${p.name} first response hours`}
                        value={row?.responseHrs ?? ''}
                        onChange={(e) => setHours(p.id, 'responseHrs', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={`input sla-grid__input${error ? ' input--error' : ''}`}
                        inputMode="numeric"
                        placeholder={String(p.resolveHrs)}
                        aria-label={`${p.name} resolution hours`}
                        value={row?.resolveHrs ?? ''}
                        onChange={(e) => setHours(p.id, 'resolveHrs', e.target.value)}
                      />
                    </td>
                    <td>
                      {custom && (
                        <button type="button" className="sla-grid__reset" onClick={() => clearRow(p.id)} title="Use the Priority master hours">
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="span-all">
          <ToggleSwitch
            id="cp-active"
            checked={isActive}
            onChange={setIsActive}
            label={isActive ? 'Active — tickets can be raised for this client product' : 'Inactive — hidden from Create Ticket and the widget'}
          />
        </div>
      </form>
    </Drawer>
  );
}
