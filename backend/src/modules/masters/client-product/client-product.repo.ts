import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { ClientProductSla } from './client-product-sla.entity';
import { ClientProduct } from './client-product.entity';

/** "clientId-productId" → number */
export type PairCounts = Record<string, number>;
export const pairKey = (clientId: number, productId: number) => `${clientId}-${productId}`;

@Injectable()
export class ClientProductRepo extends BaseRepo<ClientProduct> {
  constructor(
    @InjectRepository(ClientProduct) repo: Repository<ClientProduct>,
    @InjectRepository(ClientProductSla) private readonly slaRepo: Repository<ClientProductSla>,
  ) {
    super(repo);
  }

  list(search?: string, isActive?: boolean, clientId?: number, productId?: number): Promise<ClientProduct[]> {
    const qb = this.repo
      .createQueryBuilder('cp')
      .innerJoinAndSelect('cp.client', 'client')
      .innerJoinAndSelect('cp.product', 'product')
      .leftJoinAndSelect('cp.slas', 'sla')
      .orderBy('client.sortOrder', 'ASC')
      .addOrderBy('client.name', 'ASC')
      .addOrderBy('product.sortOrder', 'ASC')
      .addOrderBy('product.name', 'ASC');

    if (search) {
      qb.andWhere('(client.name LIKE :s OR client.code LIKE :s OR product.name LIKE :s OR product.code LIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (isActive !== undefined) qb.andWhere('cp.isActive = :isActive', { isActive });
    if (clientId) qb.andWhere('cp.clientId = :clientId', { clientId });
    if (productId) qb.andWhere('cp.productId = :productId', { productId });
    return qb.getMany();
  }

  findDetail(id: number): Promise<ClientProduct | null> {
    return this.repo.findOne({ where: { id }, relations: { client: true, product: true, slas: true } });
  }

  findPair(clientId: number, productId: number): Promise<ClientProduct | null> {
    return this.repo.findOne({ where: { clientId, productId }, relations: { client: true, product: true } });
  }

  findByClientKey(clientKey: string): Promise<ClientProduct | null> {
    return this.repo.findOne({ where: { clientKey }, relations: { client: true, product: true } });
  }

  withoutClientKey(): Promise<ClientProduct[]> {
    return this.repo.findBy({ clientKey: IsNull() });
  }

  /** The agreed SLA row for this client, product and priority, if there is one. */
  findSla(clientId: number, productId: number, priorityId: number): Promise<ClientProductSla | null> {
    return this.slaRepo
      .createQueryBuilder('s')
      .innerJoin('s.clientProduct', 'cp')
      .where('cp.clientId = :clientId AND cp.productId = :productId AND s.priorityId = :priorityId', {
        clientId,
        productId,
        priorityId,
      })
      .getOne();
  }

  /** Replaces every SLA row of a mapping. */
  async setSlas(clientProductId: number, slas: { priorityId: number; responseHrs: number; resolveHrs: number }[]) {
    await this.manager.transaction(async (tx) => {
      await tx.delete(ClientProductSla, { clientProductId });
      if (slas.length) await tx.insert(ClientProductSla, slas.map((s) => ({ ...s, clientProductId })));
    });
  }

  async ticketCounts(): Promise<PairCounts> {
    return this.pairCounts('SELECT client_id AS c, product_id AS p, COUNT(*) AS total FROM tickets WHERE client_id IS NOT NULL GROUP BY client_id, product_id');
  }

  async employeeCounts(): Promise<PairCounts> {
    return this.pairCounts('SELECT client_id AS c, product_id AS p, COUNT(*) AS total FROM employee_assignments GROUP BY client_id, product_id');
  }

  private async pairCounts(sql: string): Promise<PairCounts> {
    const rows: { c: number; p: number; total: string | number }[] = await this.manager.query(sql);
    return Object.fromEntries(rows.map((r) => [pairKey(Number(r.c), Number(r.p)), Number(r.total)]));
  }
}
