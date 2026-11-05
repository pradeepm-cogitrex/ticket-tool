import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepo } from '../../../common/repositories/base.repo';
import { ModuleMaster } from './module.entity';

@Injectable()
export class ModuleRepo extends BaseRepo<ModuleMaster> {
  constructor(@InjectRepository(ModuleMaster) repo: Repository<ModuleMaster>) {
    super(repo);
  }

  list(search?: string, isActive?: boolean, productId?: number): Promise<ModuleMaster[]> {
    const qb = this.repo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'product')
      .orderBy('product.sortOrder', 'ASC')
      .addOrderBy('m.name', 'ASC');

    if (search) qb.andWhere('(m.name LIKE :s OR product.name LIKE :s)', { s: `%${search}%` });
    if (isActive !== undefined) qb.andWhere('m.isActive = :isActive', { isActive });
    if (productId) qb.andWhere('m.productId = :productId', { productId });
    return qb.getMany();
  }

  findByName(productId: number, name: string): Promise<ModuleMaster | null> {
    return this.repo.findOneBy({ productId, name });
  }

  ticketCounts(): Promise<Record<number, number>> {
    return this.ticketCountBy('module_id');
  }
}
