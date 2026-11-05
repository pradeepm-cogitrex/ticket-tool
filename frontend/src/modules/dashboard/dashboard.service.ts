import { apiService } from '@/shared/services/api.service';
import type { DashboardFilter, DashboardRange, DashboardSummary } from './dashboard.types';

export const dashboardService = {
  summary: (days: DashboardRange, filter: DashboardFilter = {}) =>
    apiService.get<DashboardSummary>('/dashboard/summary', { days, ...filter }),
};
