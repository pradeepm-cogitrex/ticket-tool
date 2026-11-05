import { Check, Minus, Plus } from 'lucide-react';
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

/**
 * Tick every client product the employee works on, e.g. HRMS for Sakku and HRMS for Google,
 * then set their role priority in each. Grouped by client.
 */
export function AssignmentPicker({ clientProducts, priorities, value, onChange }: AssignmentPickerProps) {
  const find = (cp: ClientProduct) => value.find((a) => same(a, cp));

  const toggle = (cp: ClientProduct) =>
    onChange(
      find(cp)
        ? value.filter((a) => !same(a, cp))
        : [...value, { clientId: cp.clientId, productId: cp.productId, rolePriority: 1 }],
    );

  const setLevel = (cp: ClientProduct, rolePriority: number) =>
    onChange(
      value.map((a) => (same(a, cp) ? { ...a, rolePriority: Math.min(Math.max(rolePriority, 1), MAX_ROLE_PRIORITY) } : a)),
    );

  if (!clientProducts.length) return <p className="muted">Map products to clients in Masters › Client-Product Map first.</p>;

  return (
    <div>
      {clientsOf(clientProducts).map((client) => (
        <div key={client.id} className="assign-group">
          <div className="assign-group__title">
            <span className="code-badge">{client.code}</span> {client.name}
          </div>
          <ul className="org-pick">
            {clientProducts
              .filter((cp) => cp.clientId === client.id)
              .map((cp) => {
                const mapped = find(cp);
                const takes = mapped ? levelTakes(mapped.rolePriority, priorities) : '';
                const inactive = !cp.isActive || !cp.client.isActive || !cp.product.isActive;
                return (
                  <li key={cp.id} className={mapped ? 'is-on' : undefined}>
                    <button type="button" className="org-pick__toggle" role="checkbox" aria-checked={!!mapped} onClick={() => toggle(cp)}>
                      <span className="option__check">{mapped && <Check />}</span>
                      <span className="org-pick__name">
                        {cp.product.name}
                        {inactive && <small> (inactive)</small>}
                      </span>
                    </button>

                    {mapped ? (
                      <div className="org-pick__level">
                        <span className="org-pick__label">Role priority</span>
                        <div className="stepper">
                          <button
                            type="button"
                            onClick={() => setLevel(cp, mapped.rolePriority - 1)}
                            disabled={mapped.rolePriority <= 1}
                            aria-label="Raise priority"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={MAX_ROLE_PRIORITY}
                            value={mapped.rolePriority}
                            onChange={(e) => setLevel(cp, Number(e.target.value) || 1)}
                            aria-label={`Role priority in ${cp.product.name} for ${cp.client.name}`}
                          />
                          <button
                            type="button"
                            onClick={() => setLevel(cp, mapped.rolePriority + 1)}
                            disabled={mapped.rolePriority >= MAX_ROLE_PRIORITY}
                            aria-label="Lower priority"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="org-pick__takes">{takes ? `Takes ${takes}` : 'No ticket priority set to this level'}</span>
                      </div>
                    ) : (
                      <span className="org-pick__off">Not assigned</span>
                    )}
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}
