import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';

/** Something we build and support, e.g. HRMS. Mapped to clients in client_products. */
@Entity('products')
export class Product extends AppBaseEntity {
  /** Short code used in ticket numbers: TKT-<CLIENT>-<PRODUCT>-mm/yy/00001 */
  @Column({ length: 20, unique: true })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
