import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { addHours } from '../../common/utils/query.util';
import { decodeFileName } from '../../common/utils/upload.util';
import { ClientProductRepo } from '../masters/client-product/client-product.repo';
import { ClientProductService } from '../masters/client-product/client-product.service';
import { ContactService } from '../masters/contact/contact.service';
import { PriorityRepo } from '../masters/priority/priority.repo';
import { StatusRepo } from '../masters/status/status.repo';
import { TicketTypeRepo } from '../masters/ticket-type/ticket-type.repo';
import { formatTicketNo } from '../tickets/ticket.service';
import { TicketRepo } from '../tickets/ticket.repo';
import { WidgetTicketDto } from './dto/widget-ticket.dto';

/** Quotes are allowed in the script, e.g. productName='HRMS'. */
const clean = (value?: string) => value?.trim().replace(/^['"]|['"]$/g, '').trim() ?? '';

@Injectable()
export class WidgetService {
  constructor(
    private readonly clientProductRepo: ClientProductRepo,
    private readonly clientProductService: ClientProductService,
    private readonly ticketTypeRepo: TicketTypeRepo,
    private readonly priorityRepo: PriorityRepo,
    private readonly statusRepo: StatusRepo,
    private readonly ticketRepo: TicketRepo,
    private readonly contactService: ContactService,
  ) {}

  /** The client product behind an embed key; it and its client and product must be active. */
  private async mappingFor(appClientId: string) {
    const mapping = await this.clientProductRepo.findByClientKey(clean(appClientId));
    if (!mapping?.isActive || !mapping.client.isActive || !mapping.product.isActive) {
      throw new NotFoundException('This application is not registered in the ticket tool');
    }
    return mapping;
  }

  /** Lets the widget check its key before showing the button, and fills the Type choices. */
  async config(appClientId: string) {
    const mapping = await this.mappingFor(appClientId);
    const types = await this.ticketTypeRepo.list(undefined, true);
    return {
      organization: `${mapping.client.name} · ${mapping.product.name}`,
      client: { code: mapping.client.code, name: mapping.client.name },
      product: { code: mapping.product.code, name: mapping.product.name },
      ticketTypes: types.map((t) => ({ id: t.id, name: t.name, isDefault: t.isDefault })),
    };
  }

  async createTicket(dto: WidgetTicketDto, files: Express.Multer.File[] = []) {
    const mapping = await this.mappingFor(dto.appClientId);
    const priority = await this.priorityRepo.findDefault();
    const status = await this.statusRepo.findDefault();
    if (!priority || !status) throw new BadRequestException('The ticket tool is not set up yet (priority or status missing)');

    const type = dto.ticketTypeId ? await this.ticketTypeRepo.findById(dto.ticketTypeId) : await this.ticketTypeRepo.findDefault();
    if (!type?.isActive) throw new BadRequestException('Choose a ticket type');

    // the user's login name in the product → their contact (name, mail, WhatsApp number) from Masters › User Contacts
    const email = dto.email?.trim().toLowerCase() || null;
    const contact = await this.contactService.match(mapping.clientId, mapping.productId, dto.username, email);

    const now = new Date();
    const sla = await this.clientProductService.slaFor(mapping.clientId, mapping.productId, priority);
    const ticket = await this.ticketRepo.create({
      clientId: mapping.clientId,
      productId: mapping.productId,
      moduleId: null,
      ticketTypeId: type.id,
      raisedById: null,
      contactId: contact?.id ?? null,
      username: dto.username.trim(),
      email: email ?? contact?.email ?? null,
      phone: contact?.phone ?? null,
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      priorityId: priority.id,
      slaResponseHrs: sla.responseHrs,
      slaResolveHrs: sla.resolveHrs,
      statusId: status.id,
      assignedToId: null,
      createdById: null,
      dueAt: addHours(now, sla.resolveHrs),
      source: 'widget',
      sourceUrl: dto.pageUrl?.slice(0, 500) || null,
    });
    const ticketNo = formatTicketNo(ticket.id, now, mapping.client.code, mapping.product.code);
    await this.ticketRepo.update(ticket.id, { ticketNo });

    await this.ticketRepo.addHistory([
      { ticketId: ticket.id, action: 'created', changedById: null, newValue: `${status.name} (via HelpX widget)` },
    ]);

    if (files.length) {
      await this.ticketRepo.addAttachments(
        files.map((f) => ({
          ticketId: ticket.id,
          replyId: null,
          fileName: decodeFileName(f.originalname),
          storedName: f.filename,
          mimeType: f.mimetype,
          size: f.size,
          uploadedById: null,
        })),
      );
    }

    // the payload the application gets back
    return {
      ticketId: ticketNo,
      organization: mapping.client.name,
      application: clean(dto.product) || clean(dto.productName) || mapping.product.name,
      createUser: dto.username.trim(),
      createdAt: now.toISOString(),
      subject: dto.subject.trim(),
      description: dto.description.trim(),
      type: type.name,
      attachments: files.length,
    };
  }
}
