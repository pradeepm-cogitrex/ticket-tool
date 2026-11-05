import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusController } from './status.controller';
import { Status } from './status.entity';
import { StatusRepo } from './status.repo';
import { StatusService } from './status.service';

@Module({
  imports: [TypeOrmModule.forFeature([Status])],
  controllers: [StatusController],
  providers: [StatusService, StatusRepo],
  exports: [StatusService, StatusRepo],
})
export class StatusModule {}
