import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../common/enums/role.enum';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { EmployeeAssignment } from './employee-assignment.entity';
import { Employee } from './employee.entity';

export interface ClientProductPair {
  clientId: number;
  productId: number;
}

@Injectable()
export class EmployeeRepo extends BaseRepo<Employee> {
  constructor(
    @InjectRepository(Employee) repo: Repository<Employee>,
    @InjectRepository(EmployeeAssignment) private readonly assignmentRepo: Repository<EmployeeAssignment>,
  ) {
    super(repo);
  }

  list(search?: string, isActive?: boolean, role?: Role, clientId?: number, productId?: number): Promise<Employee[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.assignments', 'a')
      .leftJoinAndSelect('a.client', 'client')
      .leftJoinAndSelect('a.product', 'product')
      .orderBy('e.name', 'ASC')
      .addOrderBy('a.rolePriority', 'ASC');

    if (search) qb.andWhere('(e.name LIKE :s OR e.email LIKE :s)', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('e.isActive = :isActive', { isActive });
    if (role) qb.andWhere('e.role = :role', { role });
    if (clientId) {
      qb.andWhere('e.id IN (SELECT employee_id FROM employee_assignments WHERE client_id = :clientId)', { clientId });
    }
    if (productId) {
      qb.andWhere('e.id IN (SELECT employee_id FROM employee_assignments WHERE product_id = :productId)', { productId });
    }
    return qb.getMany();
  }

  findDetail(id: number): Promise<Employee | null> {
    return this.repo.findOne({
      where: { id },
      relations: { assignments: { client: true, product: true } },
      order: { assignments: { rolePriority: 'ASC' } },
    });
  }

  /** The client + product pairs an employee works on. */
  async pairsOf(employeeId: number): Promise<ClientProductPair[]> {
    const rows = await this.assignmentRepo.find({ where: { employeeId }, select: { clientId: true, productId: true } });
    return rows.map((r) => ({ clientId: r.clientId, productId: r.productId }));
  }

  /** Includes the password hash, which is hidden everywhere else. */
  findByEmailWithPassword(email: string): Promise<Employee | null> {
    return this.repo.createQueryBuilder('e').addSelect('e.passwordHash').where('e.email = :email', { email }).getOne();
  }

  findByEmail(email: string): Promise<Employee | null> {
    return this.repo.findOneBy({ email });
  }

  /** Replaces every assignment of an employee. */
  async setAssignments(employeeId: number, assignments: (ClientProductPair & { rolePriority: number })[]): Promise<void> {
    await this.assignmentRepo.manager.transaction(async (tx) => {
      await tx.delete(EmployeeAssignment, { employeeId });
      if (assignments.length) {
        await tx.insert(
          EmployeeAssignment,
          assignments.map((a) => ({ employeeId, clientId: a.clientId, productId: a.productId, rolePriority: a.rolePriority })),
        );
      }
    });
  }

  /** Every assignment with its employee, for the organization-wise screen. */
  allAssignments(): Promise<EmployeeAssignment[]> {
    return this.assignmentRepo.find({
      relations: { employee: true },
      order: { rolePriority: 'ASC', employee: { name: 'ASC' } },
    });
  }

  async openTicketCounts(): Promise<Record<number, number>> {
    const rows: { id: number; total: string | number }[] = await this.manager.query(
      `SELECT t.assigned_to_id AS id, COUNT(*) AS total
         FROM tickets t
         JOIN statuses s ON s.id = t.status_id
        WHERE s.type = 'open' AND t.assigned_to_id IS NOT NULL
        GROUP BY t.assigned_to_id`,
    );
    return Object.fromEntries(rows.map((r) => [Number(r.id), Number(r.total)]));
  }
}
