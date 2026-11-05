import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { Status } from './status.entity';

@Injectable()
export class StatusRepo extends BaseRepo<Status> {
  constructor(@InjectRepository(Status) repo: Repository<Status>) {
    super(repo);
  }

  list(search?: string, isActive?: boolean): Promise<Status[]> {
    const qb = this.repo.createQueryBuilder('s').orderBy('s.sortOrder', 'ASC').addOrderBy('s.name', 'ASC');
    if (search) qb.andWhere('s.name LIKE :s', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('s.isActive = :isActive', { isActive });
    return qb.getMany();
  }

  findByName(name: string): Promise<Status | null> {
    return this.repo.findOneBy({ name });
  }

  findDefault(): Promise<Status | null> {
    return this.repo.findOne({ where: { isDefault: true, isActive: true } });
  }

  async clearDefault(exceptId: number): Promise<void> {
    await this.repo.createQueryBuilder().update().set({ isDefault: false }).where('id != :id', { id: exceptId }).execute();
  }

  ticketCounts(): Promise<Record<number, number>> {
    return this.ticketCountBy('status_id');
  }
}
