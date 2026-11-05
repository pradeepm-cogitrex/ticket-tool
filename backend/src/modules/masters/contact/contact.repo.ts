import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { Contact } from './contact.entity';

@Injectable()
export class ContactRepo extends BaseRepo<Contact> {
  constructor(@InjectRepository(Contact) repo: Repository<Contact>) {
    super(repo);
  }

  list(search?: string, isActive?: boolean, clientId?: number, productId?: number): Promise<Contact[]> {
    const qb = this.repo
      .createQueryBuilder('ct')
      .innerJoinAndSelect('ct.client', 'client')
      .innerJoinAndSelect('ct.product', 'product')
      .orderBy('client.sortOrder', 'ASC')
      .addOrderBy('client.name', 'ASC')
      .addOrderBy('product.sortOrder', 'ASC')
      .addOrderBy('product.name', 'ASC')
      .addOrderBy('ct.name', 'ASC');
    if (search) {
      qb.andWhere('(ct.name LIKE :s OR ct.username LIKE :s OR ct.email LIKE :s OR ct.phone LIKE :s)', { s: `%${search}%` });
    }
    if (isActive !== undefined) qb.andWhere('ct.isActive = :isActive', { isActive });
    if (clientId) qb.andWhere('ct.clientId = :clientId', { clientId });
    if (productId) qb.andWhere('ct.productId = :productId', { productId });
    return qb.getMany();
  }

  findDetail(id: number): Promise<Contact | null> {
    return this.repo.findOne({ where: { id }, relations: { client: true, product: true } });
  }

  findByIds(ids: number[]): Promise<Contact[]> {
    return ids.length ? this.repo.findBy({ id: In(ids) }) : Promise.resolve([]);
  }

  /** Same username in the same client product (MySQL compares case-insensitively). */
  findByUsername(clientId: number, productId: number, username: string): Promise<Contact | null> {
    return this.repo.findOneBy({ clientId, productId, username });
  }

  findByEmail(clientId: number, productId: number, email: string): Promise<Contact | null> {
    return this.repo.findOneBy({ clientId, productId, email, isActive: true });
  }

  /** Tickets linked to each contact. */
  async ticketCounts(): Promise<Record<number, number>> {
    const rows: { id: number; total: string | number }[] = await this.manager.query(
      'SELECT contact_id AS id, COUNT(*) AS total FROM tickets WHERE contact_id IS NOT NULL GROUP BY contact_id',
    );
    return Object.fromEntries(rows.map((r) => [Number(r.id), Number(r.total)]));
  }
}
