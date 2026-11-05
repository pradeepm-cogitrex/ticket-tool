import { useCallback, useState } from 'react';

export type FormErrors<T> = Partial<Record<keyof T, string>>;

/** Values + per-field errors for a form. Setting a field clears its error. */
export function useFormState<T extends object>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<FormErrors<T>>({});

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const reset = useCallback((next: T) => {
    setValues(next);
    setErrors({});
  }, []);

  /** Runs the checks; returns true when there are no errors. */
  const validate = useCallback(
    (check: (v: T) => FormErrors<T>) => {
      const found = check(values);
      setErrors(found);
      return Object.values(found).every((x) => !x);
    },
    [values],
  );

  return { values, errors, setField, setErrors, reset, validate };
}
