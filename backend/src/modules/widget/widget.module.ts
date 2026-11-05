import { Module } from '@nestjs/common';
import { MastersModule } from '../masters/masters.module';
import { TicketModule } from '../tickets/ticket.module';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';

/** Public API for the HelpX widget embedded in other applications. */
@Module({
  imports: [MastersModule, TicketModule],
  controllers: [WidgetController],
  providers: [WidgetService],
})
export class WidgetModule {}
