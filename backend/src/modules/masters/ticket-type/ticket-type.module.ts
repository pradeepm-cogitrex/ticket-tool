import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketTypeController } from './ticket-type.controller';
import { TicketType } from './ticket-type.entity';
import { TicketTypeRepo } from './ticket-type.repo';
import { TicketTypeService } from './ticket-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([TicketType])],
  controllers: [TicketTypeController],
  providers: [TicketTypeService, TicketTypeRepo],
  exports: [TicketTypeService, TicketTypeRepo],
})
export class TicketTypeModule {}
