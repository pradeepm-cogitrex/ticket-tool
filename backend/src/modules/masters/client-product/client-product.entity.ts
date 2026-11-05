import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';
import { Client } from '../client/client.entity';
import { Product } from '../product/product.entity';
import { ClientProductSla } from './client-product-sla.entity';

/**
 * A product sold to a client, e.g. HRMS for Sakku and HRMS for Google.
 * Tickets, employees and the HelpX widget key all belong to one of these pairs.
 */
@Entity('client_products')
@Index(['clientId', 'productId'], { unique: true })
export class ClientProduct extends AppBaseEntity {
  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Relation<Client>;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  /** Public key that identifies this client's product in the HelpX widget script (appClientId). */
  @Column({ name: 'client_key', type: 'varchar', length: 40, unique: true, nullable: true })
  clientKey: string | null;

  /** SLA hours for this client and product, per ticket priority. Priorities without a row use the Priority master hours. */
  @OneToMany(() => ClientProductSla, (s) => s.clientProduct, { cascade: true })
  slas: Relation<ClientProductSla>[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
