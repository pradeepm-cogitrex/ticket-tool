import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';
import { StatusType } from '../../../common/enums/status-type.enum';

@Entity('statuses')
export class Status extends AppBaseEntity {
  @Column({ length: 50, unique: true })
  name: string;

  /** open = active work; closed = finished (sets resolved date). */
  @Column({ type: 'enum', enum: StatusType, default: StatusType.Open })
  type: StatusType;

  /** Stops the SLA clock, e.g. On Hold while waiting on the customer. */
  @Column({ name: 'pauses_sla', default: false })
  pausesSla: boolean;

  /** A resolution note is required before a ticket can move to this status. */
  @Column({ name: 'requires_note', default: false })
  requiresNote: boolean;

  /** Final status: the ticket becomes read-only (no replies, files or changes). */
  @Column({ name: 'locks_ticket', default: false })
  locksTicket: boolean;

  /** New tickets start in the default status. */
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ length: 20, default: '#64748b' })
  color: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
