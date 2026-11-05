import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { parseActive } from '../../../common/utils/query.util';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';
import { TicketType } from './ticket-type.entity';
import { TicketTypeRepo } from './ticket-type.repo';

@Injectable()
export class TicketTypeService {
  constructor(private readonly ticketTypeRepo: TicketTypeRepo) {}

  async findAll(query: ListQueryDto) {
    const [types, counts] = await Promise.all([
      this.ticketTypeRepo.list(query.search, parseActive(query.active)),
      this.ticketTypeRepo.ticketCounts(),
    ]);
    return types.map((t) => ({ ...t, ticketCount: counts[t.id] ?? 0 }));
  }

  async findOne(id: number): Promise<TicketType> {
    const found = await this.ticketTypeRepo.findById(id);
    if (!found) throw new NotFoundException('Ticket type not found');
    return found;
  }

  async create(dto: CreateTicketTypeDto) {
    const name = dto.name.trim();
    await this.ensureUniqueName(name);
    const created = await this.ticketTypeRepo.create({ ...dto, name });
    if (created.isDefault) await this.ticketTypeRepo.clearDefault(created.id);
    return created;
  }

  async update(id: number, dto: UpdateTicketTypeDto) {
    const current = await this.findOne(id);
    const data = { ...dto };
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      await this.ensureUniqueName(data.name, id);
    }
    if (current.isDefault && dto.isDefault === false) {
      throw new BadRequestException('Make another ticket type the default instead');
    }
    const updated = await this.ticketTypeRepo.update(id, data);
    if (dto.isDefault) await this.ticketTypeRepo.clearDefault(id);
    return updated;
  }

  async setActive(id: number, isActive: boolean) {
    const current = await this.findOne(id);
    if (!isActive && current.isDefault) throw new BadRequestException('The default ticket type cannot be deactivated');
    return this.ticketTypeRepo.update(id, { isActive });
  }

  private async ensureUniqueName(name: string, exceptId?: number) {
    const existing = await this.ticketTypeRepo.findByName(name);
    if (existing && existing.id !== exceptId) throw new ConflictException(`Ticket type "${name}" already exists`);
  }
}
