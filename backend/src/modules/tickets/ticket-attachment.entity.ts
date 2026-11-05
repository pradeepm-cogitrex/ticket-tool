import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Employee } from '../masters/employee/employee.entity';
import { TicketReply } from './ticket-reply.entity';
import { Ticket } from './ticket.entity';

@Entity('ticket_attachments')
export class TicketAttachment extends AppBaseEntity {
  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Relation<Ticket>;

  @Column({ name: 'reply_id', type: 'int', nullable: true })
  replyId: number | null;

  @ManyToOne(() => TicketReply, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reply_id' })
  reply: Relation<TicketReply> | null;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  /** Name of the file on disk inside UPLOAD_DIR. */
  @Column({ name: 'stored_name', length: 255, select: false })
  storedName: string;

  @Column({ name: 'mime_type', length: 120 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  /** null when the file came from the HelpX widget */
  @Column({ name: 'uploaded_by_id', type: 'int', nullable: true })
  uploadedById: number | null;

  @ManyToOne(() => Employee, { nullable: true })
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: Relation<Employee> | null;
}
