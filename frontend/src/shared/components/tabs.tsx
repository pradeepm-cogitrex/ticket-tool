import { ReactNode } from 'react';
import { cn } from '../utils/cn.util';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
  tone?: 'danger';
}

interface TabsProps<T extends string> {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function Tabs<T extends string>({ value, items, onChange, ariaLabel }: TabsProps<T>) {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          className={cn('tab', t.tone === 'danger' && t.count ? 'tab--danger' : undefined)}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count !== undefined && <span className="tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
