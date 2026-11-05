import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriorityController } from './priority.controller';
import { Priority } from './priority.entity';
import { PriorityRepo } from './priority.repo';
import { PriorityService } from './priority.service';

@Module({
  imports: [TypeOrmModule.forFeature([Priority])],
  controllers: [PriorityController],
  providers: [PriorityService, PriorityRepo],
  exports: [PriorityService, PriorityRepo],
})
export class PriorityModule {}
