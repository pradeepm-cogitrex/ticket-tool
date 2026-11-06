import { apiService } from '@/shared/services/api.service';
import type { CustomRange, DashboardDays, DashboardFilter, DashboardSummary } from './dashboard.types';

export const dashboardService = {
  /** `range` is a number of days up to today, or a custom from / to */
  summary: (range: DashboardDays | CustomRange, filter: DashboardFilter = {}) =>
    apiService.get<DashboardSummary>('/dashboard/summary', {
      ...(typeof range === 'number' ? { days: range } : range),
      ...filter,
    }),
};
