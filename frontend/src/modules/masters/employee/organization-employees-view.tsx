import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, List, Plus, UserPlus, UserRoundX } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { ROLE_LABEL } from '@/modules/auth/auth.types';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';
import { PageHeader } from '@/shared/components/page-header';
import { errorMessage } from '@/shared/services/api.service';
import { plural } from '@/shared/utils/format.util';
import { invalidateLookups, useLookups } from '../use-lookups';
import { RolePriorityBadge } from './components/role-priority-badge';
import { EmployeeForm } from './employee-form';
import { employeeService } from './employee.service';
import type { Employee, OrganizationEmployees, OrganizationMember } from './employee.types';
import { levelTakes } from './role-priority';

/** Each organization (product) with its employees grouped by role priority. */
export default function OrganizationEmployeesView() {
  const { isSuperAdmin: isAdmin } = useAuth();
  const { lookups } = useLookups();
  const [data, setData] = useState<OrganizationEmployees | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [preset, setPreset] = useState<{ clientId: number; productId: number }>();

  const load = useCallback(async () => {
    try {
      setData(await employeeService.byOrganization());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = (pair?: { clientId: number; productId: number }) => {
    setEditing(null);
    setPreset(pair);
    setFormOpen(true);
  };

  const openEdit = async (id: number) => {
    if (!isAdmin) return;
    try {
      setEditing(await employeeService.get(id));
      setPreset(undefined);
      setFormOpen(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const levels = (members: OrganizationMember[]) =>
    Array.from(new Set(members.map((m) => m.rolePriority))).sort((a, b) => a - b);

  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={
          <>
            <Boxes size={14} /> Masters
          </>
        }
        title="Employees by client product"
        actions={
          <>
            <Link to="/masters/employees" className="btn">
              <List /> Employee list
            </Link>
            {isAdmin && (
              <Button variant="primary" icon={<Plus />} onClick={() => openNew()}>
                Add employee
              </Button>
            )}
          </>
        }
      />

      {error && (
        <div className="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="org-grid">
        {!data &&
          Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="card org-card">
              <span className="skeleton" style={{ width: '40%', height: 18 }} />
              <span className="skeleton" style={{ width: '100%', height: 120, marginTop: 18, borderRadius: 12 }} />
            </div>
          ))}

        {data?.organizations.map((org) => (
          <section key={org.id} className={`card org-card${org.isActive ? '' : ' is-inactive'}`}>
            <header className="org-card__head">
              <div>
                <span className="code-badge">{org.client.code}</span> <span className="code-badge">{org.product.code}</span>
                <h2 className="org-card__title">
                  {org.product.name} · {org.client.name}
                </h2>
                <span className="org-card__count">
                  {plural(org.employees.length, 'employee')}
                  {!org.isActive && ' · inactive'}
                </span>
              </div>
              {isAdmin && (
                <Button size="sm" icon={<UserPlus />} onClick={() => openNew({ clientId: org.clientId, productId: org.productId })}>
                  Add
                </Button>
              )}
            </header>

            {org.employees.length === 0 ? (
              <p className="org-card__empty">No employees on {org.product.name} for {org.client.name} yet.</p>
            ) : (
              <ol className="org-levels">
                {levels(org.employees).map((level) => {
                  const takes = levelTakes(level, lookups?.priorities);
                  return (
                    <li key={level} className="org-level">
                      <div className="org-level__head">
                        <RolePriorityBadge level={level} />
                        <span>{takes ? `Takes ${takes}` : 'No ticket priority mapped'}</span>
                      </div>
                      <ul className="org-people">
                        {org.employees
                          .filter((m) => m.rolePriority === level)
                          .map((m) => (
                            <li key={m.id}>
                              <button
                                type="button"
                                className={`org-person${m.isActive ? '' : ' is-inactive'}`}
                                onClick={() => openEdit(m.id)}
                                disabled={!isAdmin}
                              >
                                <Avatar name={m.name} />
                                <span className="org-person__meta">
                                  <strong>
                                    {m.name}
                                    {m.role !== 'employee' && <span className="org-person__admin">{ROLE_LABEL[m.role]}</span>}
                                  </strong>
                                  <span>{m.email}</span>
                                </span>
                                <span className="org-person__open" title="Open tickets">
                                  {m.openTickets} open
                                </span>
                              </button>
                            </li>
                          ))}
                      </ul>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        ))}

        {data && data.unmapped.length > 0 && (
          <section className="card org-card org-card--unmapped">
            <header className="org-card__head">
              <div>
                <h2 className="org-card__title">
                  <UserRoundX size={18} /> Not assigned to any client product
                </h2>
                <span className="org-card__count">Map them so tickets can be assigned by role priority</span>
              </div>
            </header>
            <ul className="org-people">
              {data.unmapped.map((m) => (
                <li key={m.id}>
                  <button type="button" className="org-person" onClick={() => openEdit(m.id)} disabled={!isAdmin}>
                    <Avatar name={m.name} />
                    <span className="org-person__meta">
                      <strong>{m.name}</strong>
                      <span>{m.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <EmployeeForm
        open={formOpen}
        item={editing}
        defaultAssignment={preset}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          invalidateLookups();
          load();
        }}
      />
    </div>
  );
}
