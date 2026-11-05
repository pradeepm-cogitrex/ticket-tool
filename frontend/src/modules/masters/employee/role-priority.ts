import type { Priority } from '../priority/priority.types';

/** "Urgent, High" — the ticket priorities that a role priority level takes, from the Priority master. */
export function levelTakes(level: number, priorities: Priority[] | undefined): string {
  const names = (priorities ?? []).filter((p) => p.isActive && p.assignRolePriority === level).map((p) => p.name);
  return names.join(', ');
}
