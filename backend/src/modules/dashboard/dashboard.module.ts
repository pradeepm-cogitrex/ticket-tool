import { Module } from '@nestjs/common';
import { MastersModule } from '../masters/masters.module';
import { TicketModule } from '../tickets/ticket.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TicketModule, MastersModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
