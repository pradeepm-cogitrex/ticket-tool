import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/app-base.entity';
import { Contact } from '../masters/contact/contact.entity';
import { Employee } from '../masters/employee/employee.entity';
import { Ticket } from './ticket.entity';

export type NotificationChannel = 'email' | 'whatsapp';
/** not_configured = saved, but mail / WATI credentials are not set yet, so nothing went out */
export type NotificationStatus = 'sent' | 'failed' | 'not_configured';

/** One message sent (or tried) to a user contact about a ticket, by mail or WhatsApp. */
@Entity('ticket_notifications')
export class TicketNotification extends AppBaseEntity {
  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Relation<Ticket>;

  @Column({ name: 'contact_id', type: 'int', nullable: true })
  contactId: number | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Relation<Contact> | null;

  /** Name at the time of sending, kept even if the contact is edited later. */
  @Column({ name: 'recipient_name', length: 100 })
  recipientName: string;

  @Column({ type: 'enum', enum: ['email', 'whatsapp'] })
  channel: NotificationChannel;

  /** Email address or WhatsApp number it went to. */
  @Column({ length: 150 })
  recipient: string;

  @Column({ length: 200 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: ['sent', 'failed', 'not_configured'] })
  status: NotificationStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  error: string | null;

  @Column({ name: 'sent_by_id', type: 'int', nullable: true })
  sentById: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sent_by_id' })
  sentBy: Relation<Employee> | null;
}
