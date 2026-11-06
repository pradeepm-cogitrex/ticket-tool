import { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { SelectInput } from '@/shared/components/form/select-input';
import type { ClientProduct } from '../../client-product/client-product.types';
import { clientsOf } from '../../use-lookups';
import type { Priority } from '../../priority/priority.types';
import { AssignmentInput, MAX_ROLE_PRIORITY } from '../employee.types';
import { levelTakes } from '../role-priority';

interface AssignmentPickerProps {
  /** client products that can be picked */
  clientProducts: ClientProduct[];
  priorities: Priority[] | undefined;
  value: AssignmentInput[];
  onChange: (value: AssignmentInput[]) => void;
}

const same = (a: { clientId: number; productId: number }, b: { clientId: number; productId: number }) =>
  a.clientId === b.clientId && a.productId === b.productId;

const ALL = 'all';

/**
 * Pick a client, then one of its products (or all of them), and add it.
 * Only the assigned client products are listed, so the form stays short however many clients and products exist.
 */
export function AssignmentPicker({ clientProducts, priorities, value, onChange }: AssignmentPickerProps) {
  const clients = useMemo(() => clientsOf(clientProducts), [clientProducts]);
  const [clientId, setClientId] = useState<number | ''>(() => (clients.length === 1 ? clients[0].id : ''));
  const [productKey, setProductKey] = useState<string>('');

  const isAssigned = (cp: ClientProduct) => value.some((a) => same(a, cp));
  // products of the chosen client that are not assigned yet
  const available = clientId ? clientProducts.filter((cp) => cp.clientId === clientId && !isAssigned(cp)) : [];

  const add = () => {
    const picked = productKey === ALL ? available : available.filter((cp) => String(cp.productId) === productKey);
    if (!picked.length) return;
    onChange([...value, ...picked.map((cp) => ({ clientId: cp.clientId, productId: cp.productId, rolePriority: 1 }))]);
    setProductKey('');
  };

  const remove = (a: AssignmentInput) => onChange(value.filter((x) => !same(x, a)));

  const setLevel = (a: AssignmentInput, rolePriority: number) =>
    onChange(value.map((x) => (same(x, a) ? { ...x, rolePriority: Math.min(Math.max(rolePriority, 1), MAX_ROLE_PRIORITY) } : x)));

  if (!clientProducts.length) return <p className="muted">Map products to clients in Masters › Client-Product Map first.</p>;

  // assigned rows, in client then product order
  const rows = clientProducts
    .map((cp) => ({ cp, a: value.find((x) => same(x, cp)) }))
    .filter((r): r is { cp: ClientProduct; a: AssignmentInput } => !!r.a);

  return (
    <div className="assign">
      <div className="assign__add">
        <SelectInput
          aria-label="Client"
          placeholder="Select client"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value ? Number(e.target.value) : '');
            setProductKey('');
          }}
          options={clients.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
        />
        <SelectInput
          aria-label="Product"
          placeholder={!clientId ? 'Select a client first' : available.length ? 'Select product' : 'All products assigned'}
          value={productKey}
          disabled={!clientId || !available.length}
          onChange={(e) => setProductKey(e.target.value)}
          options={[
            ...(available.length > 1 ? [{ value: ALL, label: `All products (${available.length})` }] : []),
            ...available.map((cp) => ({
              value: String(cp.productId),
              label: `${cp.product.name}${!cp.isActive || !cp.product.isActive ? ' (inactive)' : ''}`,
            })),
          ]}
        />
        <Button icon={<Plus />} onClick={add} disabled={!productKey}>
          Add
        </Button>
      </div>

      {rows.length ? (
        <ul className="assign__list">
          {rows.map(({ cp, a }) => {
            const takes = levelTakes(a.rolePriority, priorities);
            return (
              <li key={cp.id} className="assign__row">
                <span className="code-badge" title={cp.client.name}>
                  {cp.client.code}
                </span>
                <span className="assign__name">
                  {cp.product.name}
                  <small>{takes ? `Takes ${takes}` : 'No ticket priority at this level'}</small>
                </span>
                <div className="stepper" title="Role priority">
                  <button type="button" onClick={() => setLevel(a, a.rolePriority - 1)} disabled={a.rolePriority <= 1} aria-label="Raise priority">
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={MAX_ROLE_PRIORITY}
                    value={a.rolePriority}
                    onChange={(e) => setLevel(a, Number(e.target.value) || 1)}
                    aria-label={`Role priority in ${cp.product.name} for ${cp.client.name}`}
                  />
                  <button
                    type="button"
                    onClick={() => setLevel(a, a.rolePriority + 1)}
                    disabled={a.rolePriority >= MAX_ROLE_PRIORITY}
                    aria-label="Lower priority"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button type="button" className="assign__remove" onClick={() => remove(a)} aria-label={`Remove ${cp.product.name} for ${cp.client.name}`}>
                  <X size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="assign__empty">Not assigned to any client product yet.</p>
      )}
    </div>
  );
}
