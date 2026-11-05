import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { ClientProductSla } from '../../modules/masters/client-product/client-product-sla.entity';
import { ClientProduct } from '../../modules/masters/client-product/client-product.entity';
import { newClientKey } from '../../modules/masters/client-product/client-product.service';
import { Client } from '../../modules/masters/client/client.entity';
import { EmployeeAssignment } from '../../modules/masters/employee/employee-assignment.entity';
import { Employee } from '../../modules/masters/employee/employee.entity';
import { ModuleMaster } from '../../modules/masters/module/module.entity';
import { Priority } from '../../modules/masters/priority/priority.entity';
import { Product } from '../../modules/masters/product/product.entity';
import { Status } from '../../modules/masters/status/status.entity';
import { TicketType } from '../../modules/masters/ticket-type/ticket-type.entity';
import {
  SEED_CLIENT_PRODUCTS,
  SEED_CLIENTS,
  SEED_EMPLOYEES,
  SEED_MODULES,
  SEED_PRIORITIES,
  SEED_PRODUCTS,
  SEED_STATUSES,
  SEED_TICKET_TYPES,
} from './seed.data';

/** Fills empty master tables and the first employees on start-up (SEED_ON_START=true). */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get<string>('SEED_ON_START') !== 'true') return;
    try {
      await this.seedMasters();
      await this.seedEmployees();
      await this.seedAssignments();
    } catch (error) {
      this.logger.error('Seeding failed', error instanceof Error ? error.stack : String(error));
    }
  }

  private repo<T extends ObjectLiteral>(entity: EntityTarget<T>) {
    return this.dataSource.getRepository(entity);
  }

  private async isEmpty<T extends ObjectLiteral>(entity: EntityTarget<T>) {
    return (await this.repo(entity).count()) === 0;
  }

  private async seedMasters() {
    if (await this.isEmpty(Client)) {
      await this.repo(Client).save(SEED_CLIENTS);
      this.logger.log('Clients added');
    }
    if (await this.isEmpty(Product)) {
      await this.repo(Product).save(SEED_PRODUCTS);
      this.logger.log('Products added');
    }
    if (await this.isEmpty(Priority)) await this.repo(Priority).save(SEED_PRIORITIES);
    if (await this.isEmpty(Status)) await this.repo(Status).save(SEED_STATUSES);
    if (await this.isEmpty(TicketType)) {
      await this.repo(TicketType).save(SEED_TICKET_TYPES);
      this.logger.log('Ticket types added');
    }

    const [clients, products] = await Promise.all([this.repo(Client).find(), this.repo(Product).find()]);

    if (await this.isEmpty(ModuleMaster)) {
      await this.repo(ModuleMaster).save(
        products.flatMap((p) => (SEED_MODULES[p.code] ?? []).map((name) => ({ productId: p.id, name }))),
      );
    }

    if (await this.isEmpty(ClientProduct)) {
      const priorities = await this.repo(Priority).find();
      for (const [clientCode, productCode, slas] of SEED_CLIENT_PRODUCTS) {
        const client = clients.find((c) => c.code === clientCode);
        const product = products.find((p) => p.code === productCode);
        if (!client || !product) continue;
        const saved = await this.repo(ClientProduct).save({ clientId: client.id, productId: product.id, clientKey: newClientKey() });
        const rows = Object.entries(slas)
          .map(([name, [responseHrs, resolveHrs]]) => ({ priority: priorities.find((p) => p.name === name), responseHrs, resolveHrs }))
          .filter((r) => r.priority)
          .map((r) => ({ clientProductId: saved.id, priorityId: r.priority!.id, responseHrs: r.responseHrs, resolveHrs: r.resolveHrs }));
        if (rows.length) await this.repo(ClientProductSla).insert(rows);
      }
      this.logger.log('Client products added');
    }
  }

  private async seedEmployees() {
    if (!(await this.isEmpty(Employee))) return;
    for (const e of SEED_EMPLOYEES) {
      await this.repo(Employee).save({
        name: e.name,
        email: e.email,
        role: e.role,
        passwordHash: await bcrypt.hash(e.password, 10),
      });
    }
    this.logger.log(`Employees added: ${SEED_EMPLOYEES.map((e) => e.email).join(', ')}`);
  }

  /** Also runs on databases from before clients existed: the starting employees get their client products. */
  private async seedAssignments() {
    if (!(await this.isEmpty(EmployeeAssignment))) return;
    const [clients, products, mappings] = await Promise.all([
      this.repo(Client).find(),
      this.repo(Product).find(),
      this.repo(ClientProduct).find(),
    ]);

    for (const e of SEED_EMPLOYEES) {
      const employee = await this.repo(Employee).findOneBy({ email: e.email });
      if (!employee) continue;
      const rows = e.assignments
        .map(([clientCode, productCode, rolePriority]) => ({
          clientId: clients.find((c) => c.code === clientCode)?.id,
          productId: products.find((p) => p.code === productCode)?.id,
          rolePriority,
        }))
        .filter((a) => mappings.some((m) => m.clientId === a.clientId && m.productId === a.productId))
        .map((a) => ({ employeeId: employee.id, clientId: a.clientId!, productId: a.productId!, rolePriority: a.rolePriority }));
      if (rows.length) await this.repo(EmployeeAssignment).insert(rows);
    }
  }
}
