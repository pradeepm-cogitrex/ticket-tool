import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { StatusType } from '../../../common/enums/status-type.enum';
import { parseActive } from '../../../common/utils/query.util';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Status } from './status.entity';
import { StatusRepo } from './status.repo';

@Injectable()
export class StatusService {
  constructor(private readonly statusRepo: StatusRepo) {}

  async findAll(query: ListQueryDto) {
    const [statuses, counts] = await Promise.all([
      this.statusRepo.list(query.search, parseActive(query.active)),
      this.statusRepo.ticketCounts(),
    ]);
    return statuses.map((s) => ({ ...s, ticketCount: counts[s.id] ?? 0 }));
  }

  async findOne(id: number): Promise<Status> {
    const status = await this.statusRepo.findById(id);
    if (!status) throw new NotFoundException('Status not found');
    return status;
  }

  async create(dto: CreateStatusDto) {
    const name = dto.name.trim();
    await this.ensureUniqueName(name);
    if (dto.locksTicket && dto.isDefault) {
      throw new BadRequestException('New tickets cannot start in a status that locks the ticket');
    }
    if (dto.isDefault && dto.type !== StatusType.Open) {
      throw new BadRequestException('The default status for new tickets must be an open-type status');
    }
    const status = await this.statusRepo.create({ ...dto, name });
    if (status.isDefault) await this.statusRepo.clearDefault(status.id);
    return status;
  }

  async update(id: number, dto: UpdateStatusDto) {
    const current = await this.findOne(id);
    const data = { ...dto };
    if (dto.name) {
      data.name = dto.name.trim();
      await this.ensureUniqueName(data.name, id);
    }
    const willBeDefault = dto.isDefault ?? current.isDefault;
    if (willBeDefault && (dto.type ?? current.type) !== StatusType.Open) {
      throw new BadRequestException('The default status for new tickets must be an open-type status');
    }
    if (current.isDefault && dto.isDefault === false) {
      throw new BadRequestException('Make another status the default instead');
    }
    const updated = await this.statusRepo.update(id, data);
    if (dto.isDefault) await this.statusRepo.clearDefault(id);
    return updated;
  }

  async setActive(id: number, isActive: boolean) {
    const current = await this.findOne(id);
    if (!isActive && current.isDefault) throw new BadRequestException('The default status cannot be deactivated');
    return this.statusRepo.update(id, { isActive });
  }

  private async ensureUniqueName(name: string, exceptId?: number) {
    const existing = await this.statusRepo.findByName(name);
    if (existing && existing.id !== exceptId) throw new ConflictException(`Status "${name}" already exists`);
  }
}
