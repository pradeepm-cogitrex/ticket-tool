import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Client } from '../client/client.entity';
import { Product } from '../product/product.entity';
import { Employee } from './employee.entity';

/**
 * Puts an employee on one client's product, e.g. Mohan → HRMS for Sakku and HRMS for Google,
 * with a role priority there: 1 = most senior, handles Urgent/High; higher numbers take simpler issues.
 * The client + product pair must exist in client_products.
 */
@Entity('employee_assignments')
@Index(['employeeId', 'clientId', 'productId'], { unique: true })
export class EmployeeAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id' })
  employeeId: number;

  @ManyToOne(() => Employee, (e) => e.assignments, { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'employee_id' })
  employee: Relation<Employee>;

  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Relation<Client>;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ name: 'role_priority', type: 'tinyint', unsigned: true, default: 1 })
  rolePriority: number;
}
