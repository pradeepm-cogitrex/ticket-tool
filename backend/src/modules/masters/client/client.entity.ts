import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';

/** A customer we support, e.g. Sakku or Google. Its code is the client part of the ticket number. */
@Entity('clients')
export class Client extends AppBaseEntity {
  /** Short code used in ticket numbers: TKT-<CLIENT>-<PRODUCT>-mm/yy/00001 */
  @Column({ length: 10, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 150, nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 20, nullable: true })
  contactPhone: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
