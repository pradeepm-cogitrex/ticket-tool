import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';

/** Ticket priority with its SLA targets. */
@Entity('priorities')
export class Priority extends AppBaseEntity {
  @Column({ length: 50, unique: true })
  name: string;

  /** Hours allowed until the first reply. */
  @Column({ name: 'response_hrs', type: 'int' })
  responseHrs: number;

  /** Hours allowed until resolution; sets the ticket due date. */
  @Column({ name: 'resolve_hrs', type: 'int' })
  resolveHrs: number;

  /**
   * Which employee role priority should take tickets of this priority when auto-assigning,
   * e.g. Urgent/High → 1 (senior), Medium → 2, Low → 3.
   */
  @Column({ name: 'assign_role_priority', type: 'tinyint', unsigned: true, default: 1 })
  assignRolePriority: number;

  @Column({ length: 20, default: '#64748b' })
  color: string;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
