import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { Client } from './client.entity';

@Injectable()
export class ClientRepo extends BaseRepo<Client> {
  constructor(@InjectRepository(Client) repo: Repository<Client>) {
    super(repo);
  }

  list(search?: string, isActive?: boolean): Promise<Client[]> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.sortOrder', 'ASC').addOrderBy('c.name', 'ASC');
    if (search) qb.andWhere('(c.code LIKE :s OR c.name LIKE :s)', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('c.isActive = :isActive', { isActive });
    return qb.getMany();
  }

  findByCode(code: string): Promise<Client | null> {
    return this.repo.findOneBy({ code });
  }

  ticketCounts(): Promise<Record<number, number>> {
    return this.ticketCountBy('client_id');
  }

  /** Products mapped to each client. */
  async productCounts(): Promise<Record<number, number>> {
    const rows: { id: number; total: string | number }[] = await this.manager.query(
      'SELECT client_id AS id, COUNT(*) AS total FROM client_products GROUP BY client_id',
    );
    return Object.fromEntries(rows.map((r) => [Number(r.id), Number(r.total)]));
  }
}
