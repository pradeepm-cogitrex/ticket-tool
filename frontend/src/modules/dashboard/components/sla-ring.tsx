/** Small radial gauge for the SLA compliance tile. */
export function SlaRing({ value }: { value: number | null }) {
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const pct = value ?? 0;
  const color = value === null ? 'var(--faint)' : pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
  return (
    <svg className="sla-ring" width="56" height="56" viewBox="0 0 56 56" aria-hidden>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--sunk)" strokeWidth="6" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.2,.8,.2,1)' }}
      />
    </svg>
  );
}
