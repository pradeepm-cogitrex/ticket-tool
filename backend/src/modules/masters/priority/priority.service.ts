import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { parseActive } from '../../../common/utils/query.util';
import { CreatePriorityDto } from './dto/create-priority.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { Priority } from './priority.entity';
import { PriorityRepo } from './priority.repo';

@Injectable()
export class PriorityService {
  constructor(private readonly priorityRepo: PriorityRepo) {}

  async findAll(query: ListQueryDto) {
    const [priorities, counts] = await Promise.all([
      this.priorityRepo.list(query.search, parseActive(query.active)),
      this.priorityRepo.ticketCounts(),
    ]);
    return priorities.map((p) => ({ ...p, ticketCount: counts[p.id] ?? 0 }));
  }

  async findOne(id: number): Promise<Priority> {
    const priority = await this.priorityRepo.findById(id);
    if (!priority) throw new NotFoundException('Priority not found');
    return priority;
  }

  async create(dto: CreatePriorityDto) {
    this.validateHours(dto.responseHrs, dto.resolveHrs);
    const name = dto.name.trim();
    await this.ensureUniqueName(name);
    const priority = await this.priorityRepo.create({ ...dto, name });
    if (priority.isDefault) await this.priorityRepo.clearDefault(priority.id);
    return priority;
  }

  async update(id: number, dto: UpdatePriorityDto) {
    const current = await this.findOne(id);
    this.validateHours(dto.responseHrs ?? current.responseHrs, dto.resolveHrs ?? current.resolveHrs);
    const data = { ...dto };
    if (dto.name) {
      data.name = dto.name.trim();
      await this.ensureUniqueName(data.name, id);
    }
    if (current.isDefault && dto.isDefault === false) {
      throw new BadRequestException('Make another priority the default instead');
    }
    const updated = await this.priorityRepo.update(id, data);
    if (dto.isDefault) await this.priorityRepo.clearDefault(id);
    return updated;
  }

  async setActive(id: number, isActive: boolean) {
    const current = await this.findOne(id);
    if (!isActive && current.isDefault) throw new BadRequestException('The default priority cannot be deactivated');
    return this.priorityRepo.update(id, { isActive });
  }

  private validateHours(responseHrs: number, resolveHrs: number) {
    if (resolveHrs < responseHrs) {
      throw new BadRequestException('Resolution time must be the same as or longer than response time');
    }
  }

  private async ensureUniqueName(name: string, exceptId?: number) {
    const existing = await this.priorityRepo.findByName(name);
    if (existing && existing.id !== exceptId) throw new ConflictException(`Priority "${name}" already exists`);
  }
}
