import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Priority } from '../priority/priority.entity';
import { ClientProduct } from './client-product.entity';

/** SLA hours agreed with one client for one product and one ticket priority, e.g. Sakku · HRMS · Urgent → 1h / 4h. */
@Entity('client_product_slas')
@Index(['clientProductId', 'priorityId'], { unique: true })
export class ClientProductSla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_product_id' })
  clientProductId: number;

  @ManyToOne(() => ClientProduct, (cp) => cp.slas, { onDelete: 'CASCADE', orphanedRowAction: 'delete' })
  @JoinColumn({ name: 'client_product_id' })
  clientProduct: Relation<ClientProduct>;

  @Column({ name: 'priority_id' })
  priorityId: number;

  @ManyToOne(() => Priority, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'priority_id' })
  priority: Relation<Priority>;

  /** Hours allowed until the first reply. */
  @Column({ name: 'response_hrs', type: 'int' })
  responseHrs: number;

  /** Hours allowed until resolution; sets the ticket due date. */
  @Column({ name: 'resolve_hrs', type: 'int' })
  resolveHrs: number;
}
