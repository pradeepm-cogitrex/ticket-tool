import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DashboardService, DashboardWindow } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

const MAX_CUSTOM_DAYS = 366;

const parseYmd = (s: string): Date | null => {
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
};

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@Query() query: DashboardQueryDto, @CurrentUser() user: AuthUser) {
    return this.dashboardService.summary(user, this.window(query), { clientId: query.clientId, productId: query.productId });
  }

  /** The date window: a custom from / to when both are given, otherwise the last `days` days up to today. */
  private window(query: DashboardQueryDto): DashboardWindow {
    if (query.from || query.to) {
      if (!query.from || !query.to) throw new BadRequestException('Pick both a from and a to date');
      const from = parseYmd(query.from);
      const to = parseYmd(query.to);
      if (!from || !to) throw new BadRequestException('Invalid date');
      if (from > to) throw new BadRequestException('From date must be on or before the to date');
      const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
      if (days > MAX_CUSTOM_DAYS) throw new BadRequestException(`Pick a range of ${MAX_CUSTOM_DAYS} days or less`);
      return { from, days, custom: true };
    }
    const days = query.days ?? 14;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1)); // window includes today
    return { from, days, custom: false };
  }
}
