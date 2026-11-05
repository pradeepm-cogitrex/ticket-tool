import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/interfaces/auth-user.interface';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  summary(@Query() query: DashboardQueryDto, @CurrentUser() user: AuthUser) {
    return this.dashboardService.summary(user, query.days ?? 14, { clientId: query.clientId, productId: query.productId });
  }
}
