import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Employee } from '../masters/employee/employee.entity';
import { Ticket } from './ticket.entity';

/** A reply on a ticket, or an internal note that only employees see. */
@Entity('ticket_replies')
export class TicketReply extends AppBaseEntity {
  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Relation<Ticket>;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'author_id' })
  author: Relation<Employee>;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;
}
