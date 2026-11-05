import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { parseActive } from '../../../common/utils/query.util';
import { Client } from './client.entity';
import { ClientRepo } from './client.repo';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const blankToNull = (v: string | null | undefined): string | null => v?.trim() || null;

@Injectable()
export class ClientService {
  constructor(private readonly clientRepo: ClientRepo) {}

  async findAll(query: ListQueryDto) {
    const [clients, tickets, products] = await Promise.all([
      this.clientRepo.list(query.search, parseActive(query.active)),
      this.clientRepo.ticketCounts(),
      this.clientRepo.productCounts(),
    ]);
    return clients.map((c) => ({ ...c, ticketCount: tickets[c.id] ?? 0, productCount: products[c.id] ?? 0 }));
  }

  async findOne(id: number): Promise<Client> {
    const client = await this.clientRepo.findById(id);
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async create(dto: CreateClientDto): Promise<Client> {
    const code = dto.code.trim().toUpperCase();
    await this.ensureUniqueCode(code);
    return this.clientRepo.create({
      ...dto,
      code,
      name: dto.name.trim(),
      contactEmail: blankToNull(dto.contactEmail)?.toLowerCase() ?? null,
      contactPhone: blankToNull(dto.contactPhone),
    });
  }

  async update(id: number, dto: UpdateClientDto): Promise<Client | null> {
    await this.findOne(id);
    const data: Partial<Client> = { ...dto } as Partial<Client>;
    if (dto.code !== undefined) {
      data.code = dto.code.trim().toUpperCase();
      await this.ensureUniqueCode(data.code, id);
    }
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.contactEmail !== undefined) data.contactEmail = blankToNull(dto.contactEmail)?.toLowerCase() ?? null;
    if (dto.contactPhone !== undefined) data.contactPhone = blankToNull(dto.contactPhone);
    return this.clientRepo.update(id, data);
  }

  async setActive(id: number, isActive: boolean): Promise<Client | null> {
    await this.findOne(id);
    return this.clientRepo.update(id, { isActive });
  }

  private async ensureUniqueCode(code: string, exceptId?: number) {
    const existing = await this.clientRepo.findByCode(code);
    if (existing && existing.id !== exceptId) throw new ConflictException(`Client code "${code}" is already used`);
  }
}
