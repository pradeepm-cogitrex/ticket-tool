import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { Priority } from './priority.entity';

@Injectable()
export class PriorityRepo extends BaseRepo<Priority> {
  constructor(@InjectRepository(Priority) repo: Repository<Priority>) {
    super(repo);
  }

  list(search?: string, isActive?: boolean): Promise<Priority[]> {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.sortOrder', 'ASC').addOrderBy('p.name', 'ASC');
    if (search) qb.andWhere('p.name LIKE :s', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('p.isActive = :isActive', { isActive });
    return qb.getMany();
  }

  findByName(name: string): Promise<Priority | null> {
    return this.repo.findOneBy({ name });
  }

  findDefault(): Promise<Priority | null> {
    return this.repo.findOne({ where: { isDefault: true, isActive: true } });
  }

  /** Only one priority can be the default. */
  async clearDefault(exceptId: number): Promise<void> {
    await this.repo.createQueryBuilder().update().set({ isDefault: false }).where('id != :id', { id: exceptId }).execute();
  }

  ticketCounts(): Promise<Record<number, number>> {
    return this.ticketCountBy('priority_id');
  }
}
