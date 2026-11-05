import { Column, Entity, OneToMany, Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';
import { Role } from '../../../common/enums/role.enum';
import { EmployeeAssignment } from './employee-assignment.entity';

/** Staff who sign in and work on tickets. Assigned to one or more client products. */
@Entity('employees')
export class Employee extends AppBaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile: string | null;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.Employee })
  role: Role;

  @OneToMany(() => EmployeeAssignment, (a) => a.employee, { cascade: true })
  assignments: Relation<EmployeeAssignment>[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt: Date | null;
}
