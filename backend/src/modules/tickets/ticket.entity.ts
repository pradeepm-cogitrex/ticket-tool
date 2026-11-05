import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Client } from '../masters/client/client.entity';
import { Contact } from '../masters/contact/contact.entity';
import { Employee } from '../masters/employee/employee.entity';
import { ModuleMaster } from '../masters/module/module.entity';
import { Priority } from '../masters/priority/priority.entity';
import { Product } from '../masters/product/product.entity';
import { Status } from '../masters/status/status.entity';
import { TicketType } from '../masters/ticket-type/ticket-type.entity';

export type TicketSource = 'portal' | 'widget';

@Entity('tickets')
@Index(['statusId', 'dueAt'])
@Index(['clientId', 'productId'])
export class Ticket extends AppBaseEntity {
  /** TKT-SAKKU-HRMS-11/26/00128, set right after insert from the id. */
  @Column({ name: 'ticket_no', type: 'varchar', length: 60, unique: true, nullable: true })
  ticketNo: string | null;

  /** null only on tickets raised before clients existed */
  @Column({ name: 'client_id', type: 'int', nullable: true })
  clientId: number | null;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Relation<Client> | null;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ name: 'module_id', type: 'int', nullable: true })
  moduleId: number | null;

  @ManyToOne(() => ModuleMaster, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'module_id' })
  module: Relation<ModuleMaster> | null;

  /** Incident, Change Request, Blocker… null only on tickets raised before the master existed */
  @Column({ name: 'ticket_type_id', type: 'int', nullable: true })
  ticketTypeId: number | null;

  @ManyToOne(() => TicketType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: Relation<TicketType> | null;

  /** The employee who raised the issue, when picked from the Employee master. */
  @Column({ name: 'raised_by_id', type: 'int', nullable: true })
  raisedById: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'raised_by_id' })
  raisedBy: Relation<Employee> | null;

  /** The user contact this ticket is about (matched by username from the product, or picked by hand). Informed on assign / resolve. */
  @Column({ name: 'contact_id', type: 'int', nullable: true })
  contactId: number | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<Contact> | null;

  /** Person who raised the issue (copied from the employee, or typed for someone outside the master). */
  @Column({ length: 100 })
  username: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ length: 200 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'priority_id' })
  priorityId: number;

  @ManyToOne(() => Priority)
  @JoinColumn({ name: 'priority_id' })
  priority: Relation<Priority>;

  /** SLA hours that applied to this ticket: the client's agreed hours, or the Priority master hours. */
  @Column({ name: 'sla_response_hrs', type: 'int', nullable: true })
  slaResponseHrs: number | null;

  @Column({ name: 'sla_resolve_hrs', type: 'int', nullable: true })
  slaResolveHrs: number | null;

  @Column({ name: 'status_id' })
  statusId: number;

  @ManyToOne(() => Status)
  @JoinColumn({ name: 'status_id' })
  status: Relation<Status>;

  @Column({ name: 'assigned_to_id', type: 'int', nullable: true })
  assignedToId: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: Relation<Employee> | null;

  /** Employee who logged it; null when it came from the HelpX widget in an application. */
  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: Relation<Employee> | null;

  /** portal = logged in TicketDesk; widget = raised from an application through the HelpX script */
  @Column({ type: 'enum', enum: ['portal', 'widget'], default: 'portal' })
  source: TicketSource;

  /** Page the widget was opened on. */
  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl: string | null;

  @Column({ name: 'due_at', type: 'datetime' })
  dueAt: Date;

  @Column({ name: 'first_response_at', type: 'datetime', nullable: true })
  firstResponseAt: Date | null;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;

  /** Root cause analysis: what caused the issue (network, performance, code, data…). */
  @Column({ name: 'rca_note', type: 'text', nullable: true })
  rcaNote: string | null;

  /** Who wrote the RCA: 'agent' when the automatic draft was submitted unchanged, 'human' otherwise. */
  @Column({ name: 'rca_by', type: 'varchar', length: 10, nullable: true })
  rcaBy: RcaBy | null;
}

export type RcaBy = 'agent' | 'human';
