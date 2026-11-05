import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { TicketType } from './ticket-type.entity';

@Injectable()
export class TicketTypeRepo extends BaseRepo<TicketType> {
  constructor(@InjectRepository(TicketType) repo: Repository<TicketType>) {
    super(repo);
  }

  list(search?: string, isActive?: boolean): Promise<TicketType[]> {
    const qb = this.repo.createQueryBuilder('tt').orderBy('tt.sortOrder', 'ASC').addOrderBy('tt.name', 'ASC');
    if (search) qb.andWhere('tt.name LIKE :s', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('tt.isActive = :isActive', { isActive });
    return qb.getMany();
  }

  findByName(name: string): Promise<TicketType | null> {
    return this.repo.findOneBy({ name });
  }

  findDefault(): Promise<TicketType | null> {
    return this.repo.findOne({ where: { isDefault: true, isActive: true } });
  }

  /** Only one ticket type can be the default. */
  async clearDefault(exceptId: number): Promise<void> {
    await this.repo.createQueryBuilder().update().set({ isDefault: false }).where('id != :id', { id: exceptId }).execute();
  }

  ticketCounts(): Promise<Record<number, number>> {
    return this.ticketCountBy('ticket_type_id');
  }
}
