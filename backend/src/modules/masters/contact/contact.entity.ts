import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { AppBaseEntity } from '../../../common/entities/app-base.entity';
import { Client } from '../client/client.entity';
import { Product } from '../product/product.entity';

/**
 * A person at a client who uses one of our products, e.g. Ravi at Sakku on HRMS.
 * `username` is their login in that product: a ticket raised from the product with this
 * username is linked to the contact, so the ticket tool knows their mail and number.
 */
@Entity('contacts')
@Index(['clientId', 'productId'])
@Index(['clientId', 'productId', 'username'], { unique: true })
export class Contact extends AppBaseEntity {
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

  @Column({ length: 100 })
  name: string;

  /** Login name in the product. null when the person has none. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string | null;

  /** WhatsApp number with country code, e.g. 919876543210 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
