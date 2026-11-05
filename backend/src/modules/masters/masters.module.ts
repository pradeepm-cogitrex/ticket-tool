import { Module } from '@nestjs/common';
import { ClientProductModule } from './client-product/client-product.module';
import { ClientModule } from './client/client.module';
import { ContactModule } from './contact/contact.module';
import { EmployeeModule } from './employee/employee.module';
import { ModuleMasterModule } from './module/module.module';
import { PriorityModule } from './priority/priority.module';
import { ProductModule } from './product/product.module';
import { StatusModule } from './status/status.module';
import { TicketTypeModule } from './ticket-type/ticket-type.module';

const MASTERS = [
  ClientModule,
  ProductModule,
  ClientProductModule,
  ContactModule,
  ModuleMasterModule,
  TicketTypeModule,
  PriorityModule,
  StatusModule,
  EmployeeModule,
];

/** Groups every master (lookup) module so other modules can import them in one go. */
@Module({
  imports: MASTERS,
  exports: MASTERS,
})
export class MastersModule {}
