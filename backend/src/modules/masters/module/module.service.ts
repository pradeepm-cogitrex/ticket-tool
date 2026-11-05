import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { parseActive } from '../../../common/utils/query.util';
import { CreateModuleDto } from './dto/create-module.dto';
import { ModuleQueryDto } from './dto/module-query.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleMaster } from './module.entity';
import { ModuleRepo } from './module.repo';

@Injectable()
export class ModuleService {
  constructor(private readonly moduleRepo: ModuleRepo) {}

  async findAll(query: ModuleQueryDto) {
    const [modules, counts] = await Promise.all([
      this.moduleRepo.list(query.search, parseActive(query.active), query.productId),
      this.moduleRepo.ticketCounts(),
    ]);
    return modules.map((m) => ({ ...m, ticketCount: counts[m.id] ?? 0 }));
  }

  async findOne(id: number): Promise<ModuleMaster> {
    const found = await this.moduleRepo.findById(id, ['product']);
    if (!found) throw new NotFoundException('Module not found');
    return found;
  }

  async create(dto: CreateModuleDto) {
    const name = dto.name.trim();
    await this.ensureUnique(dto.productId, name);
    const created = await this.moduleRepo.create({ ...dto, name });
    return this.findOne(created.id);
  }

  async update(id: number, dto: UpdateModuleDto) {
    const current = await this.findOne(id);
    const data = { ...dto };
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.name !== undefined || dto.productId !== undefined) {
      await this.ensureUnique(dto.productId ?? current.productId, data.name ?? current.name, id);
    }
    await this.moduleRepo.update(id, data);
    return this.findOne(id);
  }

  async setActive(id: number, isActive: boolean) {
    await this.findOne(id);
    await this.moduleRepo.update(id, { isActive });
    return this.findOne(id);
  }

  private async ensureUnique(productId: number, name: string, exceptId?: number) {
    const existing = await this.moduleRepo.findByName(productId, name);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Module "${name}" already exists for this product`);
    }
  }
}
