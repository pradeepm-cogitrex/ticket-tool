import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatShortDate } from '@/shared/utils/date.util';
import type { DashboardSummary } from '../dashboard.types';
import { useThemeColors } from '../use-theme-colors';

interface TrendTooltipProps {
  active?: boolean;
  label?: string;
  payload?: { dataKey: string; value: number }[];
}

function TrendTooltip({ active, label, payload }: TrendTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const get = (key: string) => payload.find((p) => p.dataKey === key)?.value ?? 0;
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">{new Date(label).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
      <div className="chart-tip__row">
        <span className="chart-tip__dot" style={{ background: 'var(--accent)' }} /> Created <strong>{get('created')}</strong>
      </div>
      <div className="chart-tip__row">
        <span className="chart-tip__dot" style={{ background: 'var(--amber)' }} /> Resolved <strong>{get('resolved')}</strong>
      </div>
    </div>
  );
}

/** Created vs resolved per day. */
export function TrendChart({ data }: { data: DashboardSummary['trend'] }) {
  const c = useThemeColors();
  const tickEvery = data.length > 30 ? 14 : data.length > 14 ? 4 : data.length > 7 ? 2 : 1;

  return (
    <div className="chart-box" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="g-created" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.32} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="g-resolved" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c.amber} stopOpacity={0.22} />
              <stop offset="100%" stopColor={c.amber} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.line} strokeDasharray="3 4" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            interval={tickEvery - 1}
            tick={{ fill: c.muted, fontSize: 11.5, fontWeight: 600 }}
            tickFormatter={(d: string) => formatShortDate(d)}
            dy={6}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: c.muted, fontSize: 11.5 }} width={44} />
          <Tooltip content={<TrendTooltip />} cursor={{ stroke: c.faint, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="resolved" stroke={c.amber} strokeWidth={2} fill="url(#g-resolved)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: c.amber }} />
          <Area type="monotone" dataKey="created" stroke={c.accent} strokeWidth={2.5} fill="url(#g-created)" dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: c.surface, fill: c.accent }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
