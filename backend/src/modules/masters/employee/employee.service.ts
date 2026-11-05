import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../../common/enums/role.enum';
import { AuthUser } from '../../../common/interfaces/auth-user.interface';
import { parseActive } from '../../../common/utils/query.util';
import { ClientProductRepo } from '../client-product/client-product.repo';
import { AssignmentDto, CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './employee.entity';
import { EmployeeRepo } from './employee.repo';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepo: EmployeeRepo,
    private readonly clientProductRepo: ClientProductRepo,
  ) {}

  async findAll(query: EmployeeQueryDto) {
    const [employees, openCounts] = await Promise.all([
      this.employeeRepo.list(query.search, parseActive(query.active), query.role, query.clientId, query.productId),
      this.employeeRepo.openTicketCounts(),
    ]);
    return employees.map((e) => ({ ...e, openTickets: openCounts[e.id] ?? 0 }));
  }

  /** Each client product with its employees in role-priority order, plus employees assigned nowhere. */
  async byOrganization() {
    const [clientProducts, employees, assignments, openCounts] = await Promise.all([
      this.clientProductRepo.list(),
      this.employeeRepo.list(),
      this.employeeRepo.allAssignments(),
      this.employeeRepo.openTicketCounts(),
    ]);

    const organizations = clientProducts.map((cp) => ({
      id: cp.id,
      clientId: cp.clientId,
      productId: cp.productId,
      client: { id: cp.client.id, code: cp.client.code, name: cp.client.name },
      product: { id: cp.product.id, code: cp.product.code, name: cp.product.name },
      isActive: cp.isActive && cp.client.isActive && cp.product.isActive,
      employees: assignments
        .filter((a) => a.clientId === cp.clientId && a.productId === cp.productId)
        .map((a) => ({
          id: a.employee.id,
          name: a.employee.name,
          email: a.employee.email,
          role: a.employee.role,
          isActive: a.employee.isActive,
          rolePriority: a.rolePriority,
          openTickets: openCounts[a.employee.id] ?? 0,
        })),
    }));

    const assigned = new Set(assignments.map((a) => a.employeeId));
    const unmapped = employees
      .filter((e) => !assigned.has(e.id) && e.role !== Role.SuperAdmin)
      .map((e) => ({ id: e.id, name: e.name, email: e.email, role: e.role, isActive: e.isActive, openTickets: openCounts[e.id] ?? 0 }));

    return { organizations, unmapped };
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepo.findDetail(id);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const email = dto.email.trim().toLowerCase();
    await this.ensureUniqueEmail(email);
    const assignments = await this.checkAssignments(dto.assignments ?? []);
    const { password, assignments: _assignments, ...data } = dto;

    const employee = await this.employeeRepo.create({
      ...data,
      email,
      name: data.name.trim(),
      passwordHash: await bcrypt.hash(password, 10),
    });
    await this.employeeRepo.setAssignments(employee.id, assignments);
    return this.findOne(employee.id);
  }

  async update(id: number, dto: UpdateEmployeeDto, currentUser: AuthUser): Promise<Employee> {
    const current = await this.findOne(id);
    const { password, assignments, email, ...data } = dto;

    if (id === currentUser.id && data.role && data.role !== current.role) {
      throw new BadRequestException('You cannot change your own access');
    }
    if (id === currentUser.id && data.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const patch: Partial<Employee> = { ...data };
    if (data.name) patch.name = data.name.trim();
    if (email) {
      patch.email = email.trim().toLowerCase();
      await this.ensureUniqueEmail(patch.email, id);
    }
    if (password) patch.passwordHash = await bcrypt.hash(password, 10);

    if (Object.keys(patch).length) await this.employeeRepo.update(id, patch);
    if (assignments) await this.employeeRepo.setAssignments(id, await this.checkAssignments(assignments));
    return this.findOne(id);
  }

  async setActive(id: number, isActive: boolean, currentUser: AuthUser) {
    if (id === currentUser.id && !isActive) throw new BadRequestException('You cannot deactivate your own account');
    await this.findOne(id);
    await this.employeeRepo.update(id, { isActive });
    return this.findOne(id);
  }

  /** Each client product once, and it must be mapped in Masters › Client mapping. */
  private async checkAssignments(list: AssignmentDto[]) {
    const keys = list.map((a) => `${a.clientId}-${a.productId}`);
    if (new Set(keys).size !== keys.length) throw new BadRequestException('Each client product can be added only once');
    for (const a of list) {
      if (!(await this.clientProductRepo.findPair(a.clientId, a.productId))) {
        throw new BadRequestException('One of the client products is not mapped any more');
      }
    }
    return list;
  }

  private async ensureUniqueEmail(email: string, exceptId?: number) {
    const existing = await this.employeeRepo.findByEmail(email);
    if (existing && existing.id !== exceptId) throw new ConflictException(`${email} is already in use`);
  }
}
