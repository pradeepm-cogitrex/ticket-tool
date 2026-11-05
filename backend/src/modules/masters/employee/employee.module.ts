import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientProductModule } from '../client-product/client-product.module';
import { EmployeeAssignment } from './employee-assignment.entity';
import { EmployeeController } from './employee.controller';
import { Employee } from './employee.entity';
import { EmployeeRepo } from './employee.repo';
import { EmployeeService } from './employee.service';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, EmployeeAssignment]), ClientProductModule],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeRepo],
  exports: [EmployeeService, EmployeeRepo],
})
export class EmployeeModule {}
