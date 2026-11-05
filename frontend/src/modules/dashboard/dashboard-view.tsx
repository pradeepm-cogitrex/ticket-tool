import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlarmClockOff,
  ArrowRight,
  CheckCheck,
  Gauge,
  Inbox,
  Plus,
  RefreshCw,
  Timer,
  UserRoundX,
} from 'lucide-react';
import { useAuth } from '@/modules/auth/auth-context';
import { DueLabel } from '@/modules/tickets/components/due-label';
import { Avatar } from '@/shared/components/avatar';
import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { EmptyState } from '@/shared/components/empty-state';
import { SelectInput } from '@/shared/components/form/select-input';
import { Segmented } from '@/shared/components/segmented';
import { clientsOf, myClientProducts, productsOf, useLookups } from '@/modules/masters/use-lookups';
import { errorMessage } from '@/shared/services/api.service';
import { greeting, longDate, timeAgo } from '@/shared/utils/date.util';
import { plural } from '@/shared/utils/format.util';
import { SlaRing } from './components/sla-ring';
import { StatCard } from './components/stat-card';
import { StatusDonut } from './components/status-donut';
import { TrendChart } from './components/trend-chart';
import { dashboardService } from './dashboard.service';
import type { DashboardFilter, DashboardRange, DashboardScope, DashboardSummary } from './dashboard.types';
import './dashboard.css';

const RANGE_KEY = 'td.dashRange';

const SCOPE_LABEL: Record<DashboardScope, string> = {
  all: 'All clients and products',
  team: 'Your client products',
  mine: 'Your tickets',
};

const initialRange = (): DashboardRange => {
  try {
    const saved = Number(localStorage.getItem(RANGE_KEY));
    return ([7, 14, 30, 90] as const).includes(saved as DashboardRange) ? (saved as DashboardRange) : 14;
  } catch {
    return 14;
  }
};

export default function DashboardView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<DashboardRange>(initialRange);
  const { lookups } = useLookups();
  const [filter, setFilter] = useState<DashboardFilter>({});
  // Client / Product dropdowns: every pair for a super admin, otherwise the user's own client products
  const pairs = useMemo(() => myClientProducts(lookups, user), [lookups, user]);
  const clientOptions = clientsOf(pairs);
  const productOptions = productsOf(filter.clientId ? pairs.filter((cp) => cp.clientId === filter.clientId) : pairs);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await dashboardService.summary(range, filter));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [range, filter]);

  useEffect(() => {
    load();
    try {
      localStorage.setItem(RANGE_KEY, String(range));
    } catch {
      /* ignore */
    }
  }, [load, range]);

  const t = data?.totals;
  const firstName = user?.name.split(' ')[0] ?? 'there';
  const maxProduct = Math.max(1, ...(data?.byClientProduct ?? []).map((p) => p.total));
  // link to the ticket list with the same client / product
  const listQuery = [filter.clientId && `clientIds=${filter.clientId}`, filter.productId && `productIds=${filter.productId}`]
    .filter(Boolean)
    .map((q) => `&${q}`)
    .join('');
  const maxLoad = Math.max(1, ...(data?.employeeLoad ?? []).map((a) => a.open));
  const maxPriority = Math.max(1, ...(data?.byPriority ?? []).map((p) => p.count));

  const summaryLine = !t
    ? 'Loading your queue…'
    : t.overdue
      ? `${plural(t.open, 'open ticket')} in the queue, and ${t.overdue} past due. Start with those.`
      : t.open
        ? `${plural(t.open, 'open ticket')} in the queue and nothing overdue.`
        : 'The queue is clear. Nothing open right now.';

  return (
    <div className="dash page-enter">
      {/* Hero */}
      <section className="hero">
        <div className="hero__grid" aria-hidden />
        <div className="hero__orb hero__orb--a" aria-hidden />
        <div className="hero__orb hero__orb--b" aria-hidden />
        <div className="hero__content">
          <div className="hero__date">{longDate()}</div>
          <h1 className="hero__title">
            {greeting()}, <span>{firstName}</span>
          </h1>
          {/* <p className="hero__sub">{summaryLine}</p> */}
          <div className="hero__actions">
            <Button variant="primary" size="lg" icon={<Plus />} onClick={() => navigate('/tickets/new')}>
              New ticket
            </Button>
            <Link to="/tickets?tab=mine" className="hero__link">
              My open tickets{t ? ` · ${t.mine}` : ''} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <div className="hero__side">
          <div className="hero__metric">
            <span className="hero__metric-val tabular">{t?.createdToday ?? '–'}</span>
            <span className="hero__metric-label">created today</span>
          </div>
          <div className="hero__metric">
            <span className="hero__metric-val tabular">{t?.resolvedToday ?? '–'}</span>
            <span className="hero__metric-label">resolved today</span>
          </div>
        </div>
      </section>

      <div className="dash__bar">
        <h2 className="dash__h2">
          Overview {data && <span className="dash__scope">{SCOPE_LABEL[data.scope]}</span>}
        </h2>
        <div className="dash__bar-right">
          {clientOptions.length > 1 && (
            <SelectInput
              className="master-filter"
              aria-label="Client"
              placeholder="All clients"
              value={filter.clientId ?? ''}
              onChange={(e) => setFilter({ clientId: e.target.value ? Number(e.target.value) : undefined })}
              options={clientOptions.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          {productOptions.length > 1 && (
            <SelectInput
              className="master-filter"
              aria-label="Product"
              placeholder="All products"
              value={filter.productId ?? ''}
              onChange={(e) => setFilter((f) => ({ ...f, productId: e.target.value ? Number(e.target.value) : undefined }))}
              options={productOptions.map((p) => ({ value: p.id, label: p.name }))}
            />
          )}
          <Segmented<DashboardRange>
            ariaLabel="Date range"
            value={range}
            onChange={setRange}
            options={[
              { value: 7, label: '7 days' },
              { value: 14, label: '14 days' },
              { value: 30, label: '30 days' },
              { value: 90, label: '90 days' },
            ]}
          />
          <Button iconOnly variant="ghost" icon={<RefreshCw className={loading ? 'spin' : undefined} />} onClick={load} aria-label="Refresh" />
        </div>
      </div>

      {error && (
        <div className="alert" style={{ marginBottom: 18 }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <section className="stats">
        <StatCard label="Open" value={t?.open ?? '–'} hint={t ? `${t.mine} assigned to you` : ' '} icon={<Inbox />} tone="accent" to={`/tickets?tab=open${listQuery}`} delay={0} />
        <StatCard
          label="Overdue"
          value={t?.overdue ?? '–'}
          hint={t?.overdue ? 'Past their due date' : 'All inside SLA'}
          icon={<AlarmClockOff />}
          tone={t?.overdue ? 'danger' : 'neutral'}
          to={`/tickets?tab=overdue${listQuery}`}
          delay={60}
        />
        <StatCard label="Unassigned" value={t?.unassigned ?? '–'} hint="Waiting for an owner" icon={<UserRoundX />} tone="warning" to={`/tickets?tab=unassigned${listQuery}`} delay={120} />
        <StatCard
          label="Resolved"
          value={t?.resolvedInRange ?? '–'}
          hint={t ? `of ${t.createdInRange} created in ${range} days` : ' '}
          icon={<CheckCheck />}
          tone="info"
          to={`/tickets?tab=closed${listQuery}`}
          delay={180}
        />
        <StatCard
          label="SLA met"
          value={t?.slaCompliance == null ? '—' : `${t.slaCompliance}%`}
          hint={t?.avgResolutionHrs != null ? `Avg resolution ${t.avgResolutionHrs}h` : 'No resolved tickets yet'}
          icon={<Gauge />}
          delay={240}
        >
          <div className="stat__ring">
            <SlaRing value={t?.slaCompliance ?? null} />
          </div>
        </StatCard>
      </section>

      {/* Charts */}
      <section className="dash__row dash__row--charts">
        <article className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Ticket flow</div>
              <div className="card__sub">Created vs resolved per day, last {range} days</div>
            </div>
            <div className="legend-inline">
              <span>
                <i style={{ background: 'var(--accent)' }} /> Created
              </span>
              <span>
                <i style={{ background: 'var(--amber)' }} /> Resolved
              </span>
            </div>
          </div>
          <div className="card__body">{data ? <TrendChart data={data.trend} /> : <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />}</div>
        </article>

        <article className="card">
          <div className="card__head">
            <div>
              <div className="card__title">By status</div>
              <div className="card__sub">All tickets right now</div>
            </div>
          </div>
          <div className="card__body">{data ? <StatusDonut data={data.byStatus} /> : <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />}</div>
        </article>
      </section>

      <section className="dash__row dash__row--three">
        <article className="card">
          <div className="card__head">
            <div>
              <div className="card__title">By client · product</div>
              <div className="card__sub">Created in the last {range} days</div>
            </div>
          </div>
          <div className="card__body">
            <ul className="bars">
              {(data?.byClientProduct ?? []).map((p) => (
                <li key={p.id}>
                  <Link to={`/tickets?tab=all&clientIds=${p.client.id}&productIds=${p.product.id}`} className="bars__row">
                    <span className="bars__label">
                      <span className="code-badge">{p.client.code}</span>
                      {p.product.name}
                    </span>
                    <span className="bars__val tabular">
                      {p.total}
                      {p.open > 0 && <small> · {p.open} open</small>}
                      {p.overdue > 0 && <small className="bars__overdue"> · {p.overdue} overdue</small>}
                    </span>
                    <span className="bars__track">
                      <span className="bars__fill" style={{ width: `${(p.total / maxProduct) * 100}%` }} />
                      <span className="bars__fill bars__fill--open" style={{ width: `${(p.open / maxProduct) * 100}%` }} />
                    </span>
                  </Link>
                </li>
              ))}
              {data && !data.byClientProduct.length && <li className="muted">No client products to show.</li>}
            </ul>
          </div>
        </article>

        <article className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Open by priority</div>
              <div className="card__sub">Where the urgency sits</div>
            </div>
          </div>
          <div className="card__body">
            <ul className="prio">
              {(data?.byPriority ?? []).map((p) => (
                <li key={p.id} style={{ ['--c' as string]: p.color }}>
                  <Link to={`/tickets?tab=open&priorityIds=${p.id}${listQuery}`} className="prio__row">
                    <Chip color={p.color}>{p.name}</Chip>
                    <span className="prio__track">
                      <span className="prio__fill" style={{ width: `${(p.count / maxPriority) * 100}%` }} />
                    </span>
                    <strong className="tabular">{p.count}</strong>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="card">
          <div className="card__head">
            <div>
              <div className="card__title">{data?.scope === 'mine' ? 'Your workload' : 'Employee workload'}</div>
              <div className="card__sub">{data?.scope === 'mine' ? 'Open tickets assigned to you' : 'Open tickets per person'}</div>
            </div>
          </div>
          <div className="card__body">
            <ul className="load">
              {(data?.employeeLoad ?? []).map((a) => (
                <li key={a.id}>
                  <Link to={`/tickets?tab=open&assignee=${a.id}${listQuery}`} className="load__row">
                    <Avatar name={a.name} size="sm" />
                    <span className="load__name">{a.name}</span>
                    <span className="load__track">
                      <span className="load__fill" style={{ width: `${(a.open / maxLoad) * 100}%` }} />
                    </span>
                    <strong className="tabular">{a.open}</strong>
                  </Link>
                </li>
              ))}
              {data && !data.employeeLoad.length && <li className="muted">No active employees.</li>}
            </ul>
          </div>
        </article>
      </section>

      {/* Recent */}
      <section className="card">
        <div className="card__head">
          <div>
            <div className="card__title">Recent tickets</div>
            <div className="card__sub">The latest raised, newest first</div>
          </div>
          <Link to="/tickets?tab=all" className="see-all">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card__body" style={{ paddingTop: 10 }}>
          {data && !data.recent.length ? (
            <EmptyState
              icon={<Timer />}
              title="No tickets yet"
              text="Create the first ticket and it will show up here."
              action={
                <Button variant="primary" icon={<Plus />} onClick={() => navigate('/tickets/new')}>
                  New ticket
                </Button>
              }
            />
          ) : (
            <ul className="recent">
              {(data?.recent ?? []).map((r) => (
                <li key={r.id}>
                  <Link to={`/tickets/${r.ticketNo}`} className="recent__row">
                    <span className="ticket-no" title={r.ticketNo ?? undefined}>
                      {r.ticketNo}
                    </span>
                    <span className="recent__main">
                      <span className="recent__subject">{r.subject}</span>
                      <span className="recent__meta">
                        {r.username} · {[r.client?.name, r.product?.name].filter(Boolean).join(' · ')} · {timeAgo(r.createdAt)}
                      </span>
                    </span>
                    <Chip color={r.priority?.color} size="sm">
                      {r.priority?.name}
                    </Chip>
                    <Chip color={r.status?.color} size="sm" square>
                      {r.status?.name}
                    </Chip>
                    <span className="recent__due">
                      <DueLabel ticket={r} />
                    </span>
                    <Avatar name={r.assignedTo?.name} size="sm" />
                  </Link>
                </li>
              ))}
              {!data &&
                Array.from({ length: 5 }, (_, i) => (
                  <li key={i} style={{ padding: '14px 0' }}>
                    <span className="skeleton" style={{ width: `${60 + i * 6}%` }} />
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
