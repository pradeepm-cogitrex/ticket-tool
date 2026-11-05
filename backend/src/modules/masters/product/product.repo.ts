import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { Product } from './product.entity';

@Injectable()
export class ProductRepo extends BaseRepo<Product> {
  constructor(@InjectRepository(Product) repo: Repository<Product>) {
    super(repo);
  }

  list(search?: string, isActive?: boolean): Promise<Product[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .orderBy('p.sortOrder', 'ASC')
      .addOrderBy('p.name', 'ASC');

    if (search) qb.andWhere('(p.code LIKE :s OR p.name LIKE :s)', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('p.isActive = :isActive', { isActive });
    return qb.getMany();
  }

  findByCode(code: string): Promise<Product | null> {
    return this.repo.findOneBy({ code });
  }

  ticketCounts(): Promise<Record<number, number>> {
    return this.ticketCountBy('product_id');
  }

  /** Employees working on each product, for any client. */
  employeeCounts(): Promise<Record<number, number>> {
    return this.countBy('SELECT product_id AS id, COUNT(DISTINCT employee_id) AS total FROM employee_assignments GROUP BY product_id');
  }

  /** Clients each product is mapped to. */
  clientCounts(): Promise<Record<number, number>> {
    return this.countBy('SELECT product_id AS id, COUNT(*) AS total FROM client_products GROUP BY product_id');
  }

  private async countBy(sql: string): Promise<Record<number, number>> {
    const rows: { id: number; total: string | number }[] = await this.manager.query(sql);
    return Object.fromEntries(rows.map((r) => [Number(r.id), Number(r.total)]));
  }
}
