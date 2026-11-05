import { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { storageService } from '../services/storage.service';
import { cn } from '../utils/cn.util';
import type { SortDir } from '../types/common.types';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  /** set to make the header clickable for sorting */
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => number;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: number[];
  onSelectionChange?: (ids: number[]) => void;
  sortBy?: string;
  sortDir?: SortDir;
  onSortChange?: (key: string, dir: SortDir) => void;
  skeletonRows?: number;
  /** remembers dragged column widths under this name; defaults to the column keys */
  resizeKey?: string;
}

const MIN_COL = 56;
const CHECK_COL = 40;

type Widths = Record<string, number>;

const readWidths = (key: string): Widths => {
  try {
    return JSON.parse(storageService.get(key) ?? '{}') as Widths;
  } catch {
    return {};
  }
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  selectable,
  selected = [],
  onSelectionChange,
  sortBy,
  sortDir,
  onSortChange,
  skeletonRows = 6,
  resizeKey,
}: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);
  const storageKey = `td.cols.${resizeKey ?? columns.map((c) => c.key).join('|')}`;
  const [widths, setWidths] = useState<Widths>(() => readWidths(storageKey));
  const [resizing, setResizing] = useState(false);

  useEffect(() => {
    setWidths(readWidths(storageKey));
  }, [storageKey]);

  const fixed = Object.keys(widths).length > 0;

  const ids = rows.map(rowKey);
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someSelected = !allSelected && ids.some((id) => selected.includes(id));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allSelected ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids])));
  };

  const toggleOne = (id: number) => {
    onSelectionChange?.(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const onHeaderClick = (col: Column<T>) => {
    if (resizing || !col.sortKey || !onSortChange) return;
    const dir: SortDir = sortBy === col.sortKey && sortDir === 'DESC' ? 'ASC' : 'DESC';
    onSortChange(col.sortKey, dir);
  };

  /** Drag a header's right edge: every column keeps its current width, only this one changes. */
  const startResize = (e: ReactPointerEvent<HTMLSpanElement>, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const table = tableRef.current;
    if (!table) return;
    const current: Widths = {};
    table.querySelectorAll<HTMLTableCellElement>('thead th[data-col]').forEach((th) => {
      current[th.dataset.col!] = th.getBoundingClientRect().width;
    });
    const startX = e.clientX;
    const startW = current[key] ?? 120;
    let latest: Widths = current;
    setResizing(true);

    const move = (ev: PointerEvent) => {
      latest = { ...current, [key]: Math.max(MIN_COL, Math.round(startW + ev.clientX - startX)) };
      setWidths(latest);
    };
    const up = () => {
      storageService.set(storageKey, JSON.stringify(latest));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // let the click that ends the drag pass without sorting
      setTimeout(() => setResizing(false), 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const resetWidths = (e: ReactMouseEvent) => {
    e.stopPropagation();
    storageService.set(storageKey, null);
    setWidths({});
  };

  const colWidth = (col: Column<T>): string | number | undefined => (fixed ? widths[col.key] ?? 140 : col.width);
  const tableStyle: CSSProperties | undefined = fixed
    ? {
        tableLayout: 'fixed',
        width: columns.reduce((sum, c) => sum + (widths[c.key] ?? 140), selectable ? CHECK_COL : 0),
        minWidth: '100%',
      }
    : undefined;

  const showSkeleton = loading && rows.length === 0;

  return (
    <div className="table-scroll">
      <table
        ref={tableRef}
        style={tableStyle}
        className={cn('table', fixed && 'table--fixed', resizing && 'table--resizing', loading && rows.length > 0 && 'table--loading')}
      >
        <thead>
          <tr>
            {selectable && (
              <th className="col-check" style={fixed ? { width: CHECK_COL } : undefined}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {columns.map((col) => {
              const sorted = col.sortKey && sortBy === col.sortKey;
              return (
                <th
                  key={col.key}
                  data-col={col.key}
                  style={{ width: colWidth(col) }}
                  className={cn(col.sortKey && 'is-sortable', sorted && 'is-sorted', col.align && `align-${col.align}`)}
                  onClick={() => onHeaderClick(col)}
                  aria-sort={sorted ? (sortDir === 'ASC' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="th-label">
                    {col.header}
                    {col.sortKey &&
                      (sorted ? (
                        sortDir === 'ASC' ? <ArrowUp className="sort-icon" /> : <ArrowDown className="sort-icon" />
                      ) : (
                        <ArrowUpDown className="sort-icon" />
                      ))}
                  </span>
                  <span
                    className="col-resize"
                    onPointerDown={(e) => startResize(e, col.key)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={resetWidths}
                    title="Drag to resize · double-click to reset all columns"
                    aria-hidden
                  />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {showSkeleton &&
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`sk-${i}`}>
                {selectable && (
                  <td className="col-check">
                    <span className="skeleton" style={{ width: 18, height: 18 }} />
                  </td>
                )}
                {columns.map((col, c) => (
                  <td key={col.key}>
                    <span className="skeleton" style={{ width: `${45 + ((i * 7 + c * 13) % 45)}%` }} />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: 0, borderBottom: 0 }}>
                {empty}
              </td>
            </tr>
          )}

          {rows.map((row) => {
            const id = rowKey(row);
            const isSelected = selected.includes(id);
            return (
              <tr key={id} className={cn(onRowClick && 'is-clickable', isSelected && 'is-selected')} onClick={() => onRowClick?.(row)}>
                {selectable && (
                  <td className="col-check" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="checkbox" checked={isSelected} onChange={() => toggleOne(id)} aria-label="Select row" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={col.align ? `align-${col.align}` : undefined}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
