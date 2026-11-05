import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { ROLE_LABEL, UserRole } from '@/modules/auth/auth.types';
import { Button } from '@/shared/components/button';
import { Drawer } from '@/shared/components/drawer';
import { Field } from '@/shared/components/form/field';
import { TextInput } from '@/shared/components/form/text-input';
import { ToggleSwitch } from '@/shared/components/form/toggle-switch';
import { Segmented } from '@/shared/components/segmented';
import { useToast } from '@/shared/context/toast-context';
import { useFormState } from '@/shared/hooks/use-form-state';
import { errorMessage } from '@/shared/services/api.service';
import { useLookups } from '../use-lookups';
import { AssignmentPicker } from './components/assignment-picker';
import { employeeService } from './employee.service';
import type { Employee, EmployeePayload } from './employee.types';

interface EmployeeFormProps {
  open: boolean;
  item: Employee | null;
  /** pre-tick this client product when adding from the organization-wise screen */
  defaultAssignment?: { clientId: number; productId: number };
  onClose: () => void;
  onSaved: (employee: Employee) => void;
}

const EMPTY: EmployeePayload = {
  name: '',
  email: '',
  mobile: null,
  password: '',
  role: 'employee',
  assignments: [],
  isActive: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmployeeForm({ open, item, defaultAssignment, onClose, onSaved }: EmployeeFormProps) {
  const toast = useToast();
  const { user } = useAuth();
  const { lookups } = useLookups();
  const { values, errors, setField, reset, validate } = useFormState<EmployeePayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSelf = item?.id === user?.id;

  useEffect(() => {
    if (!open) return;
    setShowPassword(false);
    reset(
      item
        ? {
            name: item.name,
            email: item.email,
            mobile: item.mobile,
            password: '',
            role: item.role,
            assignments: item.assignments.map((a) => ({ clientId: a.clientId, productId: a.productId, rolePriority: a.rolePriority })),
            isActive: item.isActive,
          }
        : { ...EMPTY, assignments: defaultAssignment ? [{ ...defaultAssignment, rolePriority: 1 }] : [] },
    );
  }, [open, item, defaultAssignment, reset]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = validate((v) => ({
      name: !v.name.trim() ? 'Enter the name' : undefined,
      email: !EMAIL_RE.test(v.email.trim()) ? 'Enter a valid email address' : undefined,
      mobile: v.mobile && !/^[0-9+\-\s]{6,20}$/.test(v.mobile) ? 'Use digits, spaces, + or - only' : undefined,
      password:
        !item && !v.password ? 'Set a password for the first sign-in' : v.password && v.password.length < 8 ? 'Use at least 8 characters' : undefined,
    }));
    if (!ok) return;

    setSaving(true);
    try {
      const { password, ...rest } = values;
      const payload: EmployeePayload = {
        ...rest,
        name: rest.name.trim(),
        email: rest.email.trim().toLowerCase(),
        // a super admin sees everything, so assignments do not apply
        assignments: rest.role === 'super_admin' ? [] : rest.assignments,
      };
      if (password) payload.password = password; // empty on edit = keep the current password
      const saved = item ? await employeeService.update(item.id, payload) : await employeeService.create(payload);
      toast.success(item ? `${payload.name} updated` : `${payload.name} can now sign in`);
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // active client products, plus any inactive one the employee is still assigned to
  const clientProducts = (lookups?.clientProducts ?? []).filter(
    (cp) =>
      (cp.isActive && cp.client.isActive && cp.product.isActive) ||
      values.assignments.some((a) => a.clientId === cp.clientId && a.productId === cp.productId),
  );
  const ROLE_HINT: Record<UserRole, string> = {
    super_admin: 'Sees every client and product, and manages the masters',
    admin: 'Sees every ticket of the client products below, and can reopen closed tickets',
    employee: 'Works on tickets of the client products below; the dashboard shows their own tickets',
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={item ? 'Edit employee' : 'New employee'}
      title={item ? item.name : 'Add an employee'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="employee-form" loading={saving}>
            {item ? 'Save changes' : 'Add employee'}
          </Button>
        </>
      }
    >
      <form id="employee-form" className="form-grid form-grid--2" onSubmit={submit} noValidate>
        <Field label="Name" htmlFor="e-name" required error={errors.name}>
          <TextInput id="e-name" placeholder="Enter Name" value={values.name} maxLength={100} invalid={!!errors.name} onChange={(e) => setField('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Mobile" htmlFor="e-mobile" error={errors.mobile}>
          <TextInput id="e-mobile" placeholder="Enter Mobile Number" value={values.mobile ?? ''} maxLength={20} invalid={!!errors.mobile} onChange={(e) => setField('mobile', e.target.value || null)} />
        </Field>
        <Field label="Email (used to sign in)" htmlFor="e-email" required error={errors.email} className="span-all">
          <TextInput id="e-email" placeholder="Enter Email" type="email" value={values.email} maxLength={150} invalid={!!errors.email} onChange={(e) => setField('email', e.target.value)} autoComplete="off" />
        </Field>
        <Field
          label={item ? 'New password' : 'Password'}
          htmlFor="e-password"
          required={!item}
          error={errors.password}
          hint={item ? 'Leave empty to keep the current password' : 'At least 8 characters'}
          className="span-all"
        >
          <div className="input-wrap">
            <TextInput
              id="e-password" placeholder={item ? 'Enter New Password' : 'Enter Password'}
              type={showPassword ? 'text' : 'password'}
              value={values.password ?? ''}
              invalid={!!errors.password}
              onChange={(e) => setField('password', e.target.value)}
              autoComplete="new-password"
              style={{ paddingRight: 44 }}
            />
            <button type="button" className="input-wrap__clear" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>

        <Field label="Access" className="span-all" hint={ROLE_HINT[values.role]}>
          <div>
            <Segmented<UserRole>
              ariaLabel="Access"
              value={values.role}
              onChange={(v) => !isSelf && setField('role', v)}
              options={(['employee', 'admin', 'super_admin'] as UserRole[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          </div>
        </Field>

        {values.role !== 'super_admin' && (
          <>
        <div className="form-section-title">Clients &amp; products</div>
        <div className="span-all">
          <AssignmentPicker
            clientProducts={clientProducts}
            priorities={lookups?.priorities}
            value={values.assignments}
            onChange={(v) => setField('assignments', v)}
          />
          <p className="field__hint" style={{ marginTop: 8 }}>
            Role priority 1 is the most senior and takes the most urgent tickets. Set which ticket priority goes to each level in Masters › Priority &amp; SLA.
          </p>
        </div>
          </>
        )}

        <div className="span-all">
          <ToggleSwitch
            id="e-active"
            checked={values.isActive}
            onChange={(v) => setField('isActive', v)}
            disabled={isSelf}
            label={values.isActive ? 'Active — can sign in' : 'Inactive — cannot sign in'}
          />
        </div>
      </form>
    </Drawer>
  );
}
