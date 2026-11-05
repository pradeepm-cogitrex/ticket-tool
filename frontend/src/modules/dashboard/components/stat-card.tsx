import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/utils/cn.util';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: 'accent' | 'danger' | 'warning' | 'info' | 'neutral';
  to?: string;
  delay?: number;
  children?: ReactNode;
}

/** KPI tile. Links to the filtered ticket list when `to` is set. */
export function StatCard({ label, value, hint, icon, tone = 'neutral', to, delay = 0, children }: StatCardProps) {
  const body = (
    <>
      <div className="stat__top">
        <span className="stat__icon">{icon}</span>
        <span className="stat__label">{label}</span>
        {to && <ArrowUpRight className="stat__go" />}
      </div>
      <div className="stat__value tabular">{value}</div>
      {hint && <div className="stat__hint">{hint}</div>}
      {children}
    </>
  );
  const className = cn('stat', `stat--${tone}`);
  const style = { animationDelay: `${delay}ms` };
  return to ? (
    <Link to={to} className={className} style={style}>
      {body}
    </Link>
  ) : (
    <div className={className} style={style}>
      {body}
    </div>
  );
}
