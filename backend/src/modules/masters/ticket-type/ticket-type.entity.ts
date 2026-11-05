import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';

/** Kind of ticket: Incident, Change Request, Blocker, Bug, User Request… */
@Entity('ticket_types')
export class TicketType extends AppBaseEntity {
  @Column({ length: 50, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ length: 20, default: '#64748b' })
  color: string;

  /** Pre-selected on new tickets and used by the HelpX widget when the user picks nothing. */
  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
