import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Employee } from '../masters/employee/employee.entity';
import { Ticket } from './ticket.entity';

export type TicketHistoryAction = 'created' | 'updated' | 'replied' | 'noted' | 'attached' | 'notified';

/** Audit trail: every change made to a ticket, by whom and when. */
@Entity('ticket_history')
export class TicketHistory extends AppBaseEntity {
  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Relation<Ticket>;

  @Column({ length: 20 })
  action: TicketHistoryAction;

  @Column({ type: 'varchar', length: 50, nullable: true })
  field: string | null;

  @Column({ name: 'old_value', type: 'varchar', length: 255, nullable: true })
  oldValue: string | null;

  @Column({ name: 'new_value', type: 'varchar', length: 255, nullable: true })
  newValue: string | null;

  /** null when the change came from the HelpX widget */
  @Column({ name: 'changed_by_id', type: 'int', nullable: true })
  changedById: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy: Relation<Employee> | null;
}
