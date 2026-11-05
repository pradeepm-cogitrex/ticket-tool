import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { parseActive } from '../../../common/utils/query.util';
import { ClientProductRepo } from '../client-product/client-product.repo';
import { Contact } from './contact.entity';
import { ContactRepo } from './contact.repo';
import { ContactQueryDto } from './dto/contact-query.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

const blankToNull = (v: string | null | undefined): string | null => v?.trim() || null;

@Injectable()
export class ContactService {
  constructor(
    private readonly contactRepo: ContactRepo,
    private readonly clientProductRepo: ClientProductRepo,
  ) {}

  async findAll(query: ContactQueryDto) {
    const [rows, tickets] = await Promise.all([
      this.contactRepo.list(query.search, parseActive(query.active), query.clientId, query.productId),
      this.contactRepo.ticketCounts(),
    ]);
    return rows.map((c) => ({ ...c, ticketCount: tickets[c.id] ?? 0 }));
  }

  async findOne(id: number): Promise<Contact> {
    const contact = await this.contactRepo.findDetail(id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async create(dto: CreateContactDto) {
    await this.ensureMapped(dto.clientId, dto.productId);
    const data = this.normalize(dto);
    this.ensureReachable(data.email, data.phone);
    await this.ensureUniqueUsername(dto.clientId, dto.productId, data.username);
    const saved = await this.contactRepo.create({
      clientId: dto.clientId,
      productId: dto.productId,
      name: dto.name.trim(),
      username: data.username,
      email: data.email,
      phone: data.phone,
      isActive: dto.isActive ?? true,
    });
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateContactDto) {
    const current = await this.findOne(id);
    const clientId = dto.clientId ?? current.clientId;
    const productId = dto.productId ?? current.productId;
    if (clientId !== current.clientId || productId !== current.productId) await this.ensureMapped(clientId, productId);

    const data = this.normalize(dto);
    const patch: Partial<Contact> = { clientId, productId };
    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('Enter the name');
      patch.name = dto.name.trim();
    }
    if (dto.username !== undefined) patch.username = data.username;
    if (dto.email !== undefined) patch.email = data.email;
    if (dto.phone !== undefined) patch.phone = data.phone;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    this.ensureReachable(
      patch.email !== undefined ? patch.email : current.email,
      patch.phone !== undefined ? patch.phone : current.phone,
    );
    await this.ensureUniqueUsername(clientId, productId, patch.username !== undefined ? patch.username : current.username, id);
    await this.contactRepo.update(id, patch);
    return this.findOne(id);
  }

  async setActive(id: number, isActive: boolean) {
    await this.findOne(id);
    await this.contactRepo.update(id, { isActive });
    return this.findOne(id);
  }

  /**
   * The contact behind a ticket raised in a product: same username in the same client product,
   * else the same email. null when nobody matches (the ticket can be linked by hand later).
   */
  async match(clientId: number, productId: number, username?: string | null, email?: string | null): Promise<Contact | null> {
    const name = username?.trim();
    if (name) {
      const byName = await this.contactRepo.findByUsername(clientId, productId, name);
      if (byName?.isActive) return byName;
    }
    const mail = email?.trim().toLowerCase();
    return mail ? this.contactRepo.findByEmail(clientId, productId, mail) : null;
  }

  private normalize(dto: UpdateContactDto) {
    return {
      username: blankToNull(dto.username),
      email: blankToNull(dto.email)?.toLowerCase() ?? null,
      // keep digits and a leading + only, so WhatsApp gets a clean number
      phone: blankToNull(dto.phone)?.replace(/[\s-]/g, '') || null,
    };
  }

  private ensureReachable(email: string | null, phone: string | null) {
    if (!email && !phone) throw new BadRequestException('Enter an email or a phone number so the user can be informed');
  }

  private async ensureMapped(clientId: number, productId: number) {
    if (!(await this.clientProductRepo.findPair(clientId, productId))) {
      throw new BadRequestException('This product is not mapped to the selected client');
    }
  }

  private async ensureUniqueUsername(clientId: number, productId: number, username: string | null, exceptId?: number) {
    if (!username) return;
    const existing = await this.contactRepo.findByUsername(clientId, productId, username);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException(`Username "${username}" is already used by ${existing.name} in this client product`);
    }
  }
}
