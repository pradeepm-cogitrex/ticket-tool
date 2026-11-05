import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../../../common/dto/list-query.dto';
import { parseActive } from '../../../common/utils/query.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.entity';
import { ProductRepo } from './product.repo';

@Injectable()
export class ProductService {
  constructor(private readonly productRepo: ProductRepo) {}

  async findAll(query: ListQueryDto) {
    const [products, tickets, employees, clients] = await Promise.all([
      this.productRepo.list(query.search, parseActive(query.active)),
      this.productRepo.ticketCounts(),
      this.productRepo.employeeCounts(),
      this.productRepo.clientCounts(),
    ]);
    return products.map((p) => ({
      ...p,
      ticketCount: tickets[p.id] ?? 0,
      employeeCount: employees[p.id] ?? 0,
      clientCount: clients[p.id] ?? 0,
    }));
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const code = dto.code.trim().toUpperCase();
    await this.ensureUniqueCode(code);
    return this.productRepo.create({ ...dto, code, name: dto.name.trim() });
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product | null> {
    await this.findOne(id);
    const data = { ...dto };
    if (dto.code) {
      data.code = dto.code.trim().toUpperCase();
      await this.ensureUniqueCode(data.code, id);
    }
    return this.productRepo.update(id, data);
  }

  async setActive(id: number, isActive: boolean): Promise<Product | null> {
    await this.findOne(id);
    return this.productRepo.update(id, { isActive });
  }

  private async ensureUniqueCode(code: string, exceptId?: number) {
    const existing = await this.productRepo.findByCode(code);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Product code "${code}" is already used`);
    }
  }
}
