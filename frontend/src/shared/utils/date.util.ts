const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

/** 05-11-2026 */
export const formatDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = toDate(value);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

/** 05-11-2026 10:42 */
export const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = toDate(value);
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** 10:42 AM */
export const formatTime = (value: string | Date): string =>
  toDate(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** 5 Nov */
export const formatShortDate = (value: string | Date): string =>
  toDate(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** yyyy-mm-dd for <input type="date"> */
export const toInputDate = (value: Date): string =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

/** "3h", "2d 4h", "25m" */
export const formatDuration = (ms: number): string => {
  const mins = Math.round(Math.abs(ms) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h${mins % 60 && hours < 10 ? ` ${mins % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? ` ${hours % 24}h` : ''}`;
};

/** "just now", "12m ago", "3h ago", "2d ago", then the date */
export const timeAgo = (value: string | Date): string => {
  const diff = Date.now() - toDate(value).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 7 * 86_400_000) return `${formatDuration(diff)} ago`;
  return formatDate(value);
};

export const greeting = (date = new Date()): string => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const longDate = (date = new Date()): string =>
  date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
