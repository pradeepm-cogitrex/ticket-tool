import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MastersModule } from '../masters/masters.module';
import { MessagingModule } from '../messaging/messaging.module';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketHistory } from './ticket-history.entity';
import { TicketNotification } from './ticket-notification.entity';
import { TicketReply } from './ticket-reply.entity';
import { TicketController } from './ticket.controller';
import { Ticket } from './ticket.entity';
import { TicketRepo } from './ticket.repo';
import { TicketService } from './ticket.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketReply, TicketHistory, TicketAttachment, TicketNotification]),
    MastersModule,
    MessagingModule,
  ],
  controllers: [TicketController],
  providers: [TicketService, TicketRepo],
  exports: [TicketService, TicketRepo],
})
export class TicketModule {}
