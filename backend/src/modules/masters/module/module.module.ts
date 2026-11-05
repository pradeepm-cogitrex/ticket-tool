import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleController } from './module.controller';
import { ModuleMaster } from './module.entity';
import { ModuleRepo } from './module.repo';
import { ModuleService } from './module.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleMaster])],
  controllers: [ModuleController],
  providers: [ModuleService, ModuleRepo],
  exports: [ModuleService, ModuleRepo],
})
export class ModuleMasterModule {}
