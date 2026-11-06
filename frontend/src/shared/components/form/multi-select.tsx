import { ReactNode, useCallback, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useClickOutside } from '../../hooks/use-click-outside';
import { cn } from '../../utils/cn.util';

export interface MultiOption {
  value: number;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  id?: string;
  options: MultiOption[];
  value: number[];
  onChange: (value: number[]) => void;
  placeholder?: string;
  /** compact = filter-bar style: shows "Label (2)" instead of tags */
  compact?: boolean;
  label?: ReactNode;
  align?: 'left' | 'right';
}

const SEARCH_FROM = 8;

export function MultiSelect({ id, options, value, onChange, placeholder = 'Select…', compact, label, align = 'left' }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  useClickOutside(ref, close, open);

  const toggle = (v: number) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const selected = options.filter((o) => value.includes(o.value));
  // long lists (many clients / products) get a search box
  const searchable = options.length > SEARCH_FROM;
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <div className={cn('multi', compact && 'multi--compact')} ref={ref}>
      <button id={id} type="button" className="multi__trigger" aria-expanded={open} aria-haspopup="listbox" onClick={() => (open ? close() : setOpen(true))}>
        {compact ? (
          <>
            <span>{label}</span>
            {value.length > 0 && <span className="multi__count">{value.length}</span>}
          </>
        ) : selected.length ? (
          <span className="multi__values">
            {selected.map((o) => (
              <span key={o.value} className="multi__tag">
                {o.label}
              </span>
            ))}
          </span>
        ) : (
          <span className="multi__placeholder">{placeholder}</span>
        )}
        <ChevronDown />
      </button>

      {open && (
        <div className={cn('popover', align === 'right' && 'popover--right')} role="listbox" aria-multiselectable>
          {searchable && (
            <div className="popover__search">
              <Search />
              <input autoFocus placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search options" />
            </div>
          )}
          {options.length === 0 && <div className="option muted">Nothing to choose yet</div>}
          {options.length > 0 && shown.length === 0 && <div className="option muted">No matches</div>}
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={value.includes(o.value)}
              className="option"
              onClick={() => toggle(o.value)}
            >
              <span className="option__check">{value.includes(o.value) && <Check />}</span>
              {o.color && <span className="option__dot" style={{ ['--c' as string]: o.color }} />}
              {o.label}
            </button>
          ))}
          {options.length > 0 && (
            <div className="popover__footer">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(options.map((o) => o.value))}>
                Select all
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([])} disabled={!value.length}>
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
