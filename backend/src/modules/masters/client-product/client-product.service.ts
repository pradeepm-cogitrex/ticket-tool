import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { parseActive } from '../../../common/utils/query.util';
import { ClientRepo } from '../client/client.repo';
import { Priority } from '../priority/priority.entity';
import { PriorityRepo } from '../priority/priority.repo';
import { ProductRepo } from '../product/product.repo';
import { ClientProduct } from './client-product.entity';
import { ClientProductRepo, pairKey } from './client-product.repo';
import { ClientProductQueryDto } from './dto/client-product-query.dto';
import { ClientProductSlaDto, CreateClientProductDto } from './dto/create-client-product.dto';
import { UpdateClientProductDto } from './dto/update-client-product.dto';

/** Random, hard-to-guess key for the widget script. */
export const newClientKey = (): string => randomBytes(12).toString('hex');

export interface SlaHours {
  responseHrs: number;
  resolveHrs: number;
}

@Injectable()
export class ClientProductService implements OnApplicationBootstrap {
  private readonly logger = new Logger('ClientProducts');

  constructor(
    private readonly clientProductRepo: ClientProductRepo,
    private readonly clientRepo: ClientRepo,
    private readonly productRepo: ProductRepo,
    private readonly priorityRepo: PriorityRepo,
  ) {}

  /** Mappings saved without a widget key get one on start-up. */
  async onApplicationBootstrap() {
    const missing = await this.clientProductRepo.withoutClientKey();
    for (const cp of missing) await this.clientProductRepo.update(cp.id, { clientKey: newClientKey() });
    if (missing.length) this.logger.log(`Widget keys created for ${missing.length} client product(s)`);
  }

  async findAll(query: ClientProductQueryDto) {
    const [rows, tickets, employees] = await Promise.all([
      this.clientProductRepo.list(query.search, parseActive(query.active), query.clientId, query.productId),
      this.clientProductRepo.ticketCounts(),
      this.clientProductRepo.employeeCounts(),
    ]);
    return rows.map((cp) => ({
      ...cp,
      ticketCount: tickets[pairKey(cp.clientId, cp.productId)] ?? 0,
      employeeCount: employees[pairKey(cp.clientId, cp.productId)] ?? 0,
    }));
  }

  async findOne(id: number): Promise<ClientProduct> {
    const row = await this.clientProductRepo.findDetail(id);
    if (!row) throw new NotFoundException('Client product mapping not found');
    return row;
  }

  async create(dto: CreateClientProductDto) {
    const client = await this.clientRepo.findById(dto.clientId);
    if (!client) throw new BadRequestException('Client not found');
    const product = await this.productRepo.findById(dto.productId);
    if (!product) throw new BadRequestException('Product not found');
    if (await this.clientProductRepo.findPair(client.id, product.id)) {
      throw new ConflictException(`${product.name} is already mapped to ${client.name}`);
    }
    const slas = await this.checkSlas(dto.slas ?? []);

    const saved = await this.clientProductRepo.create({
      clientId: client.id,
      productId: product.id,
      isActive: dto.isActive ?? true,
      clientKey: newClientKey(),
    });
    await this.clientProductRepo.setSlas(saved.id, slas);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateClientProductDto) {
    await this.findOne(id);
    if (dto.isActive !== undefined) await this.clientProductRepo.update(id, { isActive: dto.isActive });
    if (dto.slas) await this.clientProductRepo.setSlas(id, await this.checkSlas(dto.slas));
    return this.findOne(id);
  }

  async setActive(id: number, isActive: boolean) {
    await this.findOne(id);
    await this.clientProductRepo.update(id, { isActive });
    return this.findOne(id);
  }

  /** The client's agreed hours for this priority, or the Priority master hours when none were agreed. */
  async slaFor(clientId: number | null, productId: number, priority: Priority): Promise<SlaHours> {
    const agreed = clientId ? await this.clientProductRepo.findSla(clientId, productId, priority.id) : null;
    return agreed
      ? { responseHrs: agreed.responseHrs, resolveHrs: agreed.resolveHrs }
      : { responseHrs: priority.responseHrs, resolveHrs: priority.resolveHrs };
  }

  private async checkSlas(slas: ClientProductSlaDto[]) {
    const ids = slas.map((s) => s.priorityId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Each priority can have only one SLA row');
    for (const s of slas) {
      const priority = await this.priorityRepo.findById(s.priorityId);
      if (!priority) throw new BadRequestException('One of the priorities no longer exists');
      if (s.resolveHrs < s.responseHrs) {
        throw new BadRequestException(`${priority.name}: resolution time must be the same as or longer than response time`);
      }
    }
    return slas.map((s) => ({ priorityId: s.priorityId, responseHrs: s.responseHrs, resolveHrs: s.resolveHrs }));
  }
}
