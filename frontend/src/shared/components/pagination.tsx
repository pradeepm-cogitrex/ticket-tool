import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../utils/format.util';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const pageList = (page: number, pages: number): (number | '…')[] => {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const list: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) list.push('…');
  for (let p = start; p <= end; p++) list.push(p);
  if (end < pages - 1) list.push('…');
  list.push(pages);
  return list;
};

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <div className="tabular">
        Showing <strong>{formatNumber(from)}</strong>–<strong>{formatNumber(to)}</strong> of <strong>{formatNumber(total)}</strong>
        {onPageSizeChange && (
          <>
            {' · '}
            <select
              className="select"
              style={{ display: 'inline-block', width: 'auto', minHeight: 30, height: 30, padding: '0 30px 0 10px', fontSize: 13 }}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      <nav className="pagination__pages" aria-label="Pages">
        <button className="page-btn" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft />
        </button>
        {pageList(page, pages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="page-btn" aria-hidden>
              …
            </span>
          ) : (
            <button key={p} className="page-btn" aria-current={p === page ? 'page' : undefined} onClick={() => onPageChange(p)}>
              {p}
            </button>
          ),
        )}
        <button className="page-btn" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight />
        </button>
      </nav>
    </div>
  );
}
