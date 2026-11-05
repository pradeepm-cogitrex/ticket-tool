import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';
import { Product } from '../product/product.entity';

/**
 * A functional area of a product, e.g. HRMS → Attendance, Payroll, Payslip; SaaS → PO Creation, Indent Raise.
 * (Called ModuleMaster in code because Nest already uses the name Module.)
 */
@Entity('modules')
@Index(['productId', 'name'], { unique: true })
export class ModuleMaster extends AppBaseEntity {
  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
