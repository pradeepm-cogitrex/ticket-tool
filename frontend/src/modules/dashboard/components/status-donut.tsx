import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DashboardSummary } from '../dashboard.types';
import { useThemeColors } from '../use-theme-colors';

/** Donut of all tickets by status with a clickable legend. */
export function StatusDonut({ data }: { data: DashboardSummary['byStatus'] }) {
  const c = useThemeColors();
  const total = data.reduce((sum, s) => sum + s.count, 0);
  const slices = data.filter((s) => s.count > 0);

  return (
    <div className="donut">
      <div className="donut__chart">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices.length ? slices : [{ name: 'None', count: 1, color: c.line }]}
              dataKey="count"
              nameKey="name"
              innerRadius="70%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 2.5 : 0}
              cornerRadius={4}
              stroke="none"
              isAnimationActive
            >
              {(slices.length ? slices : [{ color: c.line }]).map((s, i) => (
                <Cell key={i} fill={s.color} />
              ))}
            </Pie>
            {slices.length > 0 && (
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="chart-tip">
                      <div className="chart-tip__row">
                        <span className="chart-tip__dot" style={{ background: String(payload[0].payload.color) }} />
                        {payload[0].name} <strong>{payload[0].value}</strong>
                      </div>
                    </div>
                  ) : null
                }
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="donut__center">
          <strong className="tabular">{total}</strong>
          <span>tickets</span>
        </div>
      </div>
      <ul className="legend">
        {data.map((s) => (
          <li key={s.id}>
            <Link to={`/tickets?tab=all&statusIds=${s.id}`}>
              <span className="legend__dot" style={{ background: s.color }} />
              <span className="legend__name">{s.name}</span>
              <span className="legend__val tabular">{s.count}</span>
              <span className="legend__pct tabular">{total ? Math.round((s.count / total) * 100) : 0}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
